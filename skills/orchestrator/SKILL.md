---
name: orchestrator
description: Choose a task-fit engineering method, route through the ECC workbench library when available, and integrate verified results with one accountable owner. Use for substantial engineering, agent workflow changes, or multi-step delivery; handle small reversible edits directly.
metadata:
  origin: local-adaptation
  upstream: ECC 2.2.2
---

# ECC Workbench Orchestrator

The current advisor owns integration. Select the smallest method that fits the
task's uncertainty, failure cost, and authorization boundary. The planned plugin
is named `ecc-workbench`; refer to its capabilities only when that plugin and
the named capability are actually installed. The name `Devin` in historical
source does not select a model or runtime.

## Route the task

1. Identify the outcome, owner files/systems, dominant risk, and acceptance evidence.
2. Search local code, tests, installed skills, active tools, and project docs before adding a dependency, helper, or workflow.
3. Use the ECC catalog disposition and dependency flow as a provisional routing hint: select one primary owner, then load only the supporting reference pack that changes the decision. Metadata-only entries require source inspection before adoption; dispositions are not permanent gates.
4. Choose a mode:
   - explore/prototype when the design or mechanism is uncertain;
   - hypothesis debugging when the cause is unknown or attempted repairs failed;
   - contract-first when stable behavior has meaningful regression cost;
   - scoped delivery when interfaces and requirements are understood;
   - risk review when identity, trust, persistence, migration, retry, or external-action boundaries change.
5. Decide whether planner/executor/reviewer roles add value. Use them conditionally for substantial or independent work; keep one integrator accountable for scope, merge, and evidence. For a small task, work directly.

## Delegate and integrate

Workers receive a self-contained brief with the outcome, relevant owner files,
allowed write scope, known invariants, available evidence, and unresolved
questions. Prefer isolated workspaces when concurrent writes could collide.
Use `gpt-5.6-luna` or the host's cost-conscious equivalent for bounded workers
when that model is available; select another supported model only when the user
requests it or evidence shows a reasoning limitation. Model names are not
authorization and must be checked against the active host.

Use parallel workers for genuinely independent questions or file sets. A worker
report is evidence to inspect, not independent proof. The integrator checks
consequential claims, affected callers, and the final diff personally.

## Operating state and diagnostics

For multi-step or multi-session work, maintain a task-owned state record with
objective, phase, owner, dependencies, changed files, evidence, blockers, and
next action. Expose reason codes, progress, failure context, and recovery or
operator-stop paths when a workflow has durable or external state.

Hooks, services, MCP tools, schedulers, and control panes are conditional
implementation choices. Use them when the task's authorization, availability,
latency, and recovery requirements justify them; do not enable or copy them
merely because a reference mentions them. Validate configuration before side
effects, preserve drafts separately from polled live state, and make retries
bounded and idempotent where applicable.

## Verify the actual result

Choose checks from the changed behavior and project contract. Capture command
exit status, source/artifact identity, and relevant output. Report `PASS`,
`FAIL`, `INCOMPLETE`, or `NOT APPLICABLE` with reasons. Keep compilation,
unit/integration tests, browser behavior, endpoint health, release identity,
and live runtime acceptance as separate evidence levels.

For agent or skill changes, use the `agent-evaluation` and `workflow-audit`
capabilities when available: define capability and regression cases, record
trial-level outcomes, inspect hidden writes and permission changes, and compare
completion, defects/rework, time, cost, and safety on representative tasks.
For ML or game-AI work, use `experiment-cycle` and preserve baselines, seeds,
holdouts, artifact identity, leakage checks, negative results, and live-runtime
boundaries. For external outbound actions, use the approval and channel
discipline capabilities when the action needs them; preserve already-authorized
scope and ensure approval covers the actual payload and destination.

## References

Read only the relevant reference for the current mode:

- [working-modes.md](references/working-modes.md) for mode details;
- [reuse-and-context.md](references/reuse-and-context.md) before new dependencies or subsystems;
- [verification-evidence.md](references/verification-evidence.md) for closeout evidence;
- [system-boundaries.md](references/system-boundaries.md) for APIs, persistence, security, caching, or LLM pipelines;
- [source-and-rename.md](references/source-and-rename.md) for provenance and the local consolidation boundary.

This skill is a local adaptation. It does not install ECC, dispatch external
agents, mutate global configuration, or imply permission for deployment,
messages, payments, gameplay, or other external actions.
