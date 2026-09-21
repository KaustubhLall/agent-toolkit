---
name: ecc-operations
description: Use the project-local ECC runtime for multi-session work-item and checkpoint coordination when the task benefits from durable ownership or a task graph.
---

# ECC operations

Use this skill when work spans multiple sessions or owners, has explicit handoffs, or needs a durable task graph. Keep tiny edits in the normal project workflow.

Run the adapter from the project root with an absolute project path:

```powershell
node <workbench>\scripts\runtime.cjs --project <absolute-project> work-item list --json
node <workbench>\scripts\runtime.cjs --project <absolute-project> status
node <workbench>\scripts\runtime.cjs --project <absolute-project> doctor
```

The adapter always uses `<project>/.ecc/state.db` and serializes reads and writes through `<project>/.ecc/runtime.lock`. A lock timeout is fail-closed; inspect the owner before manual removal. It never selects models, starts agents, creates tmux sessions, syncs GitHub, writes memory, installs dependencies, or invokes hooks.

Session snapshots are redirected to `<project>/.ecc/session-recordings`. `doctor` remains a read-only diagnostic of the current ECC installation context and may report host-level install state; it is not a project health check.

Record native Codex task/worktree identifiers in work-item metadata. Use native Codex collaboration and approvals for execution. Use `session-inspect --target <explicit-file>` only when a transcript or rollout snapshot is intentionally part of the checkpoint.

Generated `.ecc` state and evidence should be ignored or separately reviewed according to the project’s tracking policy.
