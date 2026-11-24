# Review a change, audit a repository, or list shortcuts

**Change review.** Use the requested target. If none is named, inspect local
changes (staged and unstaged), or the last commit when the tree is clean.
Read the diff and follow changed contracts into
callers, callees, tests and fixtures, including untouched files. Check in order:
correctness, safety, behavior at the expected load, tests for risky logic,
material slowdowns and unnecessary code. Confirm each finding against a
concrete input or execution path. Name the location, impact and smallest
sufficient fix. Rank findings by severity, give a verdict, and say which
important paths or checks remain unverified.

**Repository audit.** Map entry points, storage, background jobs and expected
load first. Trace the highest-consequence paths end to end. Use the same review
criteria. Check dynamic and configuration references before calling code dead.
Rank actionable findings across the requested scope and identify coverage gaps.
Treat a documented shortcut within its stated limit as a deliberate decision.

**Shortcut ledger.** Search the requested code for comments marked `shortcut:`,
legacy `ponytail:`, or the marker the user specifies. Respect ignore rules
and exclude prose examples and unrelated uses. Report file, line, limit and
upgrade trigger. Flag missing triggers, give totals, and write a ledger file
only when requested.
