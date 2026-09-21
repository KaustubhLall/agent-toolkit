# Verification evidence

Choose checks from the changed behavior and project contract, using the actual
package scripts and environment. A docs-only change may need links, syntax and
diff review; a UI behavior change needs rendered interaction; a stateful action
may need a boundary test and authorized live evidence. Preserve required project
checks and distinguish pre-existing failures from regressions.

Capture the real exit status, command, source/artifact identity and relevant
output. In PowerShell inspect `$LASTEXITCODE` immediately after each native
command; piping output to a formatter can obscure failure. Keep full logs in the
task's private evidence location when useful and summarize the failing part.
Do not execute generic snippets merely because a skill calls them a verification
command. No automatic package download, dependency repair or formatting sweep.

Use PASS, FAIL, INCOMPLETE or NOT APPLICABLE with a reason. A missing runner,
skipped check, timed-out test or empty CI result is not PASS. Confirm critical
assertions really execute (for example Release builds with NDEBUG). Coverage
measures execution, not correct behavior; use project-specific targets.

Review the intended diff and affected callers against the original requirement.
Check production and alternate/mock/flag paths where both exist. A mock may prove
control flow while leaving the real integration unverified. Reproduce the actual
trigger for causal repairs and use `variant-analysis` only after confirming a
root cause when a wider search is in scope.

For privacy/security checks, prefer scoped trusted tools and redacted locations,
not command output containing raw credentials. String grep cannot certify a
repository or bundle free of secrets. Keep source, tests, endpoint health,
browser behavior, release identity and live-runtime acceptance separate.

Run checks after meaningful changes, then repeat only for new changes, failures
or unresolved concerns. Reviewers report requirement, location, concrete failure
path and smallest repair; praise or guessed risks are not findings.

Adapted from ECC verification-loop, code-reviewer and ai-regression-testing;
[provenance](ecc-source.md).


