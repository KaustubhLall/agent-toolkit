---
name: "gh-fix-ci"
description: "Inspect and repair failing GitHub Actions checks for a pull request. Use when GitHub Actions CI is failing or blocked; do not use for external CI providers or ordinary local test failures."
---

# GitHub Actions CI repair

Use `gh` to identify the PR checks, inspect only GitHub Actions checks for the current repository, and collect a focused failure context. Treat a check as green only when it is explicitly successful; pending, skipped, or unknown states need follow-up rather than a success report.

## Scope and authorization

Diagnosis is read-only. If the user has asked for a repair, implement and test the focused fix within that request; do not add another approval step solely to begin the repair. Ask before an external mutation that is not already in scope, including re-running or cancelling workflow runs, posting comments, pushing commits, opening a PR, or accessing a non-GitHub Actions provider.

## Workflow

1. Confirm `gh auth status`, resolve the PR, and resolve the repository identity.
2. Run the bundled helper. It accepts the documented nonzero `gh pr checks` exit used for failed or pending check lists, but rejects command, authentication, malformed-output, and schema errors.
3. For each failed GitHub Actions check, use the helper's validated repository-host URL before fetching metadata or logs. Report external check URLs without querying their provider.
4. Distinguish a failed check from pending, skipped, neutral, unavailable-log, no-check, and incomplete results. Use a concise snippet as evidence, then repair and run proportionate local verification when that work is authorized.
5. Do not claim the PR is currently repaired from local tests alone. Recheck the relevant PR check at the repaired commit's `headSha`; compare its check start/completion time with the repair, and report a pending or stale check as unverified.

```powershell
py -3 "<skill>/scripts/inspect_pr_checks.py" --repo . --pr 123
py -3 "<skill>/scripts/inspect_pr_checks.py" --repo . --pr 123 --json
```

The JSON form always emits one JSON object, including `ok`, `failed`, `incomplete`, and `error` outcomes. A nonzero exit remains meaningful: 1 for failed checks, 2 for incomplete checks, and 3 for an inspection error.
