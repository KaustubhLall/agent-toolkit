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

### Bound expensive code reads

Before asking a frontier model to read a complete file over the configured
read-routing threshold (default: 350 lines or 50,000 bytes), use the bounded
reader described in [bounded-read-routing](references/bounded-read-routing.md).
It sends one bounded request to a configured worker, validates returned source
locations against the local files, caps each span and the total returned lines
before reading exact local text, and otherwise returns deterministic lexical
excerpts without making an external model call. The bundled PreToolUse hook
enforces this boundary only after the native plugin is enabled and its hooks are
trusted; other providers keep the skill as an explicit fallback.

Do not route debugging, architecture, security-critical reasoning, review, or
exact edits through a summary. Use a small targeted read, or enable the
full-context escape with a concrete reason recorded for the run. Keep worker
fan-out at one invocation per request, respect file/payload/output caps, and
stop on invalid or location-free worker output. The worker is opt-in, receives
a minimal environment, and is refused common secret paths unless an explicit
reviewed override reason is present.

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

For this user's Codex work, prefer ordinary ChatGPT Chat for suitable reviews, analysis and small patches when the available surface can do the work and offers a verified separate usage route. Check that Chat itself exposes the needed GitHub tools and exact repository access before assigning branches or PRs. Keep host execution and validation with the accessible runtime. Advise the user briefly when Chat access, tools or savings cannot be verified, then continue feasible authorized work. Read [references/gpt-usage-routing.md](references/gpt-usage-routing.md) for routing and honest cost reporting.

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
