---
name: ponytail
description: "Use on coding tasks to choose the smallest change that fully works: implementing features, fixing bugs, refactoring, or choosing a dependency. Also use for code reviews, codebase audits, and requests to list deliberate shortcuts. Matches Ponytail, YAGNI, and requests to simplify over-engineered code."
license: MIT
---

# Ponytail

Honor the user's current mode. For a code review, repo audit or shortcut ledger,
follow the [report guide](references/reports.md). If the user requested only a
report, stop there. If they also requested fixes, apply the implementation
guidance below to those fixes.

First establish what has to work. Read the request and trace the affected code
from its real entry points. For a bug, search for every caller of the changed
function, including indirect consumers, and fix the shared cause where it lives.
Check affected tests, fixtures, exports, configuration and existing data. Use
the expected load and failure cost to decide what a complete fix requires.

## Choose the first sufficient option

1. Drop speculative features. If the request is broad, deliver the smallest version that does the core job.
2. Reuse the project's own component, helper or service the way its callers already do.
3. Use a standard library or platform feature that fits the project's conventions.
4. Use a dependency the project already ships. A few straightforward lines rarely justify a new package.
5. If one line expresses the whole operation clearly, use it. Otherwise write the minimum readable implementation, preserving the surrounding structure.

For example, a date field may need only the existing form input with its native
date type. Check the label, stored value, supported browsers and required date
semantics before deciding that solves the task.

Preserve validation at trust boundaries, data-loss protections, error handling,
security, accessibility, hardware calibration and every requested behavior.
Carry those checks with code you move or merge. Keep values in their existing
form when possible. Prefer deletion to another layer. For a deliberate shortcut,
leave one comment naming its limit and the condition for upgrading it:
`shortcut: <limit>, <when to upgrade>`.

Use the project's checks. For new nontrivial logic (a branch, loop, parser,
money or security rule, or new script), leave one small behavioral test or
assert-based self-check unless existing coverage already catches that failure.
Run the relevant check. A trivial edit can use a direct verification. Close
with what changed and what passed, then a line or two on consequential omissions,
unchecked behavior or residual risk.

## Mode and routing

Use **full** by default on matching tasks. **Lite** fulfills the request as given
and mentions a smaller option. **Ultra** challenges unjustified scope before
building and honors the user's decision. Honor a level selected in conversation
until changed. “Ponytail off”, “stop Ponytail” and “normal mode” disable automatic
use for the rest of that conversation until the user re-enables it. Pass the
current level or explicit opt-out to implementation workers.

For a routine edit, proceed directly. When a concrete domain question could
change the implementation or its check, use the available ECC library
(`ecc-workbench:library` or `ecc-library`) to consult a matching method. If a
manager already supplied that guidance, reuse it. If ECC is absent, use project
evidence and available domain guidance. The orchestrator owns coordination of
substantial work. This skill can run on its own.
