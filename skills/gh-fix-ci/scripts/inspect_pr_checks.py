#!/usr/bin/env python3
"""Inspect GitHub Actions PR checks without trusting arbitrary details URLs."""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from shutil import which
from typing import Any, Iterable, Sequence
from urllib.parse import urlsplit

FAILURE_VALUES = {"failure", "error", "cancelled", "timed_out", "action_required", "fail"}
SUCCESS_VALUES = {"success", "passed", "pass"}
PENDING_VALUES = {"pending", "queued", "in_progress", "waiting", "requested"}
SKIPPED_VALUES = {"skipped", "cancelled", "not_applicable"}
PENDING_LOG_MARKERS = ("still in progress", "log will be available when it is complete")
FAILURE_MARKERS = ("error", "fail", "failed", "traceback", "exception", "assert", "panic", "fatal", "timeout", "segmentation fault")
ACCEPTED_CHECK_LIST_EXIT_CODES = {0, 1, 8}


@dataclass
class GhResult:
    returncode: int
    stdout: str
    stderr: str


@dataclass(frozen=True)
class RepoIdentity:
    host: str
    owner: str
    name: str


def run_gh_command(args: Sequence[str], cwd: Path) -> GhResult:
    process = subprocess.run(["gh", *args], cwd=cwd, text=True, capture_output=True)
    return GhResult(process.returncode, process.stdout, process.stderr)


def run_gh_command_raw(args: Sequence[str], cwd: Path) -> tuple[int, bytes, str]:
    process = subprocess.run(["gh", *args], cwd=cwd, capture_output=True)
    return process.returncode, process.stdout, process.stderr.decode(errors="replace")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect GitHub Actions PR checks and failure snippets.")
    parser.add_argument("--repo", default=".", help="Path inside the target Git repository.")
    parser.add_argument("--pr", default=None, help="PR number or URL (defaults to current branch PR).")
    parser.add_argument("--max-lines", type=int, default=160)
    parser.add_argument("--context", type=int, default=30)
    parser.add_argument("--json", action="store_true", help="Emit one JSON outcome object.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        return inspect(args)
    except OSError as error:
        return emit_outcome(args.json, {"status": "error", "error": f"unable to inspect repository: {error}"}, 3)


def inspect(args: argparse.Namespace) -> int:
    repo_root = find_git_root(Path(args.repo))
    if repo_root is None:
        return emit_outcome(args.json, {"status": "error", "error": "not inside a Git repository"}, 3)
    if not ensure_gh_available(repo_root):
        return emit_outcome(args.json, {"status": "error", "error": "gh unavailable or unauthenticated"}, 3)

    pr_value = resolve_pr(args.pr, repo_root)
    if pr_value is None:
        return emit_outcome(args.json, {"status": "error", "error": "unable to resolve pull request"}, 3)
    identity = fetch_repo_identity(repo_root)
    if identity is None:
        return emit_outcome(args.json, {"pr": pr_value, "status": "error", "error": "unable to resolve repository identity"}, 3)
    checks, error = fetch_checks(pr_value, repo_root)
    if checks is None:
        return emit_outcome(args.json, {"pr": pr_value, "status": "error", "error": error or "unable to inspect checks"}, 3)

    if not checks:
        return emit_outcome(args.json, {"pr": pr_value, "status": "incomplete", "reason": "no_checks", "failedChecks": 0, "incompleteChecks": 0, "results": []}, 2)

    failed = [check for check in checks if check_state(check) == "failed"]
    incomplete = [check for check in checks if check_state(check) == "incomplete"]
    results = [analyze_check(check, identity, repo_root, max(1, args.max_lines), max(1, args.context)) for check in failed]
    if failed:
        outcome = {"pr": pr_value, "status": "failed", "failedChecks": len(failed), "incompleteChecks": len(incomplete), "results": results}
        return emit_outcome(args.json, outcome, 1)
    if incomplete:
        outcome = {"pr": pr_value, "status": "incomplete", "failedChecks": 0, "incompleteChecks": len(incomplete), "checks": incomplete, "results": []}
        return emit_outcome(args.json, outcome, 2)
    return emit_outcome(args.json, {"pr": pr_value, "status": "ok", "failedChecks": 0, "incompleteChecks": 0, "results": []}, 0)


def emit_outcome(as_json: bool, outcome: dict[str, Any], exit_code: int) -> int:
    if as_json:
        print(json.dumps(outcome, indent=2, sort_keys=True))
    else:
        render_outcome(outcome)
    return exit_code


def find_git_root(start: Path) -> Path | None:
    try:
        result = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=start, text=True, capture_output=True)
    except OSError:
        return None
    return Path(result.stdout.strip()) if result.returncode == 0 and result.stdout.strip() else None


def ensure_gh_available(repo_root: Path) -> bool:
    if which("gh") is None:
        print("Error: gh is not installed or not on PATH.", file=sys.stderr)
        return False
    result = run_gh_command(["auth", "status"], repo_root)
    if result.returncode == 0:
        return True
    print((result.stderr or result.stdout or "Error: gh not authenticated.").strip(), file=sys.stderr)
    return False


def resolve_pr(pr_value: str | None, repo_root: Path) -> str | None:
    if pr_value:
        return pr_value
    result = run_gh_command(["pr", "view", "--json", "number"], repo_root)
    if result.returncode != 0:
        print((result.stderr or result.stdout or "Error: unable to resolve PR.").strip(), file=sys.stderr)
        return None
    try:
        number = json.loads(result.stdout).get("number")
    except (json.JSONDecodeError, AttributeError):
        return None
    return str(number) if number else None


def fetch_repo_identity(repo_root: Path) -> RepoIdentity | None:
    result = run_gh_command(["repo", "view", "--json", "nameWithOwner,url"], repo_root)
    if result.returncode != 0:
        return None
    try:
        data = json.loads(result.stdout)
        owner, name = str(data["nameWithOwner"]).split("/", 1)
        host = urlsplit(str(data["url"])).hostname
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None
    return RepoIdentity(host.lower(), owner, name) if host and owner and name else None


def fetch_checks(pr_value: str, repo_root: Path) -> tuple[list[dict[str, Any]] | None, str | None]:
    fields = ["name", "state", "conclusion", "detailsUrl", "startedAt", "completedAt"]
    result = run_gh_command(["pr", "checks", pr_value, "--json", ",".join(fields)], repo_root)
    if result.returncode not in ACCEPTED_CHECK_LIST_EXIT_CODES:
        return None, command_error(result, "gh pr checks failed")
    data, error = parse_check_list(result.stdout)
    if error is None:
        return data, None
    # A field-drift error has no usable JSON. Only then retry the documented older fields.
    available = parse_available_fields("\n".join(filter(None, [result.stderr, result.stdout])))
    if not available:
        return None, error
    fallback = [field for field in ["name", "state", "bucket", "link", "startedAt", "completedAt", "workflow"] if field in available]
    if not fallback:
        return None, "gh pr checks exposes no usable fields"
    retry = run_gh_command(["pr", "checks", pr_value, "--json", ",".join(fallback)], repo_root)
    if retry.returncode not in ACCEPTED_CHECK_LIST_EXIT_CODES:
        return None, command_error(retry, "gh pr checks fallback failed")
    return parse_check_list(retry.stdout)


def parse_check_list(stdout: str) -> tuple[list[dict[str, Any]] | None, str | None]:
    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        return None, "unable to parse checks JSON"
    if not isinstance(data, list) or any(not isinstance(item, dict) for item in data):
        return None, "unexpected checks JSON schema"
    return data, None


def command_error(result: GhResult, fallback: str) -> str:
    return (result.stderr or result.stdout or fallback).strip()


def check_state(check: dict[str, Any]) -> str:
    values = [normalize_field(check.get(key)) for key in ("conclusion", "state", "status", "bucket")]
    if any(value in FAILURE_VALUES for value in values):
        return "failed"
    if any(value in PENDING_VALUES or value in SKIPPED_VALUES for value in values):
        return "incomplete"
    if any(value in SUCCESS_VALUES for value in values):
        return "success"
    return "incomplete"


def analyze_check(check: dict[str, Any], identity: RepoIdentity, repo_root: Path, max_lines: int, context: int) -> dict[str, Any]:
    url = str(check.get("detailsUrl") or check.get("link") or "")
    base: dict[str, Any] = {"name": check.get("name", ""), "detailsUrl": url}
    run_id, job_id = validated_actions_ids(url, identity)
    if run_id is None:
        base.update(status="external", note="Check URL is not a GitHub Actions URL for this repository; no external provider was queried.")
        return base
    base.update(runId=run_id)
    if job_id:
        base.update(jobId=job_id)
    metadata = fetch_run_metadata(run_id, repo_root)
    log_text, log_error, log_status = fetch_check_log(run_id, job_id, repo_root)
    if log_status == "pending":
        base.update(status="log_pending", note=log_error or "Logs are not available yet.")
    elif log_error:
        base.update(status="log_unavailable", error=log_error)
    else:
        base.update(status="ok", logSnippet=extract_failure_snippet(log_text, max_lines, context), logTail=tail_lines(log_text, max_lines))
    if metadata:
        base["run"] = metadata
    return base


def validated_actions_ids(url: str, identity: RepoIdentity) -> tuple[str | None, str | None]:
    try:
        parsed = urlsplit(url)
    except ValueError:
        return None, None
    if parsed.scheme != "https" or not parsed.hostname or parsed.hostname.lower() != identity.host:
        return None, None
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) not in (5, 7):
        return None, None
    if parts[0].lower() != identity.owner.lower() or parts[1].lower() != identity.name.lower() or parts[2:4] != ["actions", "runs"] or not parts[4].isdigit():
        return None, None
    if len(parts) == 7 and (parts[5] != "job" or not parts[6].isdigit()):
        return None, None
    return parts[4], parts[6] if len(parts) == 7 else None


def fetch_run_metadata(run_id: str, repo_root: Path) -> dict[str, Any] | None:
    result = run_gh_command(["run", "view", run_id, "--json", "conclusion,status,workflowName,name,event,headBranch,headSha,url"], repo_root)
    if result.returncode != 0:
        return None
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def fetch_check_log(run_id: str, job_id: str | None, repo_root: Path) -> tuple[str, str, str]:
    if job_id:
        text, error = fetch_job_log(job_id, repo_root)
        if text:
            return text, "", "ok"
        return "", error, "pending" if is_log_pending_message(error) else "error"
    text, error = fetch_run_log(run_id, repo_root)
    if text:
        return text, "", "ok"
    return "", error, "pending" if is_log_pending_message(error) else "error"


def fetch_run_log(run_id: str, repo_root: Path) -> tuple[str, str]:
    result = run_gh_command(["run", "view", run_id, "--log"], repo_root)
    return (result.stdout, "") if result.returncode == 0 else ("", command_error(result, "gh run view failed"))


def fetch_job_log(job_id: str, repo_root: Path) -> tuple[str, str]:
    slug = fetch_repo_slug(repo_root)
    if not slug:
        return "", "unable to resolve repository name for job logs"
    code, payload, stderr = run_gh_command_raw(["api", f"/repos/{slug}/actions/jobs/{job_id}/logs"], repo_root)
    if code != 0:
        return "", (stderr or payload.decode(errors="replace") or "gh api job logs failed").strip()
    if payload.startswith(b"PK"):
        return "", "job logs returned a zip archive; unable to parse"
    return payload.decode(errors="replace"), ""


def fetch_repo_slug(repo_root: Path) -> str | None:
    identity = fetch_repo_identity(repo_root)
    return f"{identity.owner}/{identity.name}" if identity else None


def normalize_field(value: Any) -> str:
    return str(value or "").strip().lower()


def parse_available_fields(message: str) -> list[str]:
    marker = "Available fields:"
    if marker not in message:
        return []
    return [line.strip() for line in message.split(marker, 1)[1].splitlines() if line.strip()]


def is_log_pending_message(message: str) -> bool:
    return any(marker in message.lower() for marker in PENDING_LOG_MARKERS)


def extract_failure_snippet(log_text: str, max_lines: int, context: int) -> str:
    lines = log_text.splitlines()
    match = next((idx for idx in range(len(lines) - 1, -1, -1) if any(marker in lines[idx].lower() for marker in FAILURE_MARKERS)), None)
    if match is None:
        return "\n".join(lines[-max_lines:])
    return "\n".join(lines[max(0, match - context): min(len(lines), match + context)][-max_lines:])


def tail_lines(text: str, max_lines: int) -> str:
    return "\n".join(text.splitlines()[-max_lines:]) if max_lines > 0 else ""


def render_outcome(outcome: dict[str, Any]) -> None:
    status = outcome["status"]
    if status == "ok":
        print(f"PR #{outcome['pr']}: all reported checks are explicitly successful.")
    elif status == "incomplete":
        if outcome.get("reason") == "no_checks":
            print(f"PR #{outcome['pr']}: no checks were reported; status is incomplete.")
        else:
            print(f"PR #{outcome['pr']}: {outcome['incompleteChecks']} check(s) are pending, skipped, neutral, or unknown.")
    elif status == "failed":
        print(f"PR #{outcome['pr']}: {outcome['failedChecks']} failing check(s) analyzed.")
        render_results(outcome["results"])
    else:
        print(f"Error: {outcome['error']}", file=sys.stderr)


def render_results(results: Iterable[dict[str, Any]]) -> None:
    for result in results:
        print("-" * 60)
        print(f"Check: {result.get('name', '')}")
        print(f"Status: {result.get('status', 'unknown')}")
        if result.get("detailsUrl"):
            print(f"Details: {result['detailsUrl']}")
        if result.get("note"):
            print(f"Note: {result['note']}")
        if result.get("error"):
            print(f"Error fetching logs: {result['error']}")
        if result.get("logSnippet"):
            print("Failure snippet:\n" + result["logSnippet"])


if __name__ == "__main__":
    raise SystemExit(main())
