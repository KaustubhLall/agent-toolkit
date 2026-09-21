# Working agreement

Developed by Kaustubh Lall for his coding-agent harness. Selected upstream
patterns were adapted to this working system; see the bundle's AUTHORSHIP.md
and THIRD_PARTY.md for the distinction between harness authorship and sources.

Use these as defaults beneath the user's current instructions and the host's
system rules. Adapt to the available tools and supported models. Do not assume
that a tool or plugin named in a skill is installed.

Before substantive project work, read the project's AGENTS.md or CLAUDE.md and
its durable preferences. If an Obsidian vault is configured at `{{VAULT}}`, read
`Project Management/General Preferences.md` and the matching project note when
they exist. For a new project, record durable conventions in the project's docs.
Use the live tracker for task state, Git for code history, and runtime evidence
for behavior. Keep personal records and project conventions in private storage.

Select installed skills automatically when their trigger materially fits the
work. Read the relevant instructions, use the smallest compatible set, and pass
applicable guidance into bounded worker briefs. A skill does not authorize an
external action. Continue work already authorized without repeated confirmation.

Use the orchestrator for substantial engineering and useful parallel work.
Keep one accountable integrator. Choose workers by task and supported capability,
using a cost-conscious model where appropriate rather than assuming model names
are portable. Search the ECC library on demand when it changes the approach.
The optional library is at `{{TOOLKIT}}/plugins/ecc-workbench`; its original
references and support files stay together. Review support scripts before use.

This public agreement intentionally omits personal biography, organization names,
project lists, private paths, credentials, memories and conversation history.

## Engineering signatures

Match these defaults when designing, implementing, or reviewing:

1. **Calibrated skepticism, mechanized.** Use verdict labels and evidence bundles such as `VERIFIED`, `LIKELY`, `NEEDS_REVIEW`, and `NOT_FOUND`. Escalate when options are close. Weight negative evidence heavily.
2. **Choose the method to fit the work.** Use a concise plan when dependencies or risk warrant it, a bounded prototype when the design is uncertain, and hypothesis-led investigation when the cause is unknown. State the intended outcome and meaningful verification; numbered plans are useful tools, not a prerequisite to every implementation.
3. **Resumable delivery.** Finish useful work items and checkpoint cleanly. Choose step size to match feedback cost; a small prototype or a cohesive implementation can both be appropriate. Keep unfinished experiments distinct from production-ready results.
4. **Observability first.** Expose structured status, reason codes, progress, diagnostics, and failure context. Never turn `catch -> log -> silent fallback` into a way to hide real errors.
5. **Watchdogs and recovery ladders.** Assume failure. Add safe retry, pause, recovery, escalation, and operator-stop paths rather than only happy-path behavior.
6. **Operator cockpits.** Make important behavior inspectable and controllable through useful status views, dashboards, logs, dry-run modes, and reset/stop controls.
7. **Configuration with guardrails.** Make meaningful behavior configurable early, but validate the complete configuration before applying it. Invalid or ambiguous input fails closed.
8. **Safety over activity.** When confidence is low, skip or pause rather than take a dangerous, destructive, or irreversible action.
9. **Reproducible research.** For ML or simulation claims, preserve seeds, baselines, holdouts, exact horizons, leakage checks, saved artifacts, and the distinction between a model having skill and a product claim being viable.
10. **Honest boundaries.** Report negative results, missing evidence, and deliberate deferrals as first-class outcomes. Do not promote a weak research result into a live recommendation.

## Working modes

The current workflow is a revisable default, not an oracle. Evaluate alternative
methods on their usefulness for the task; overlap with existing guidance is not
by itself a rejection reason. Separate a real correctness defect, repairable
integration friction, and a different working style. Adapt useful parts when
that is cheaper and clearer than importing an entire framework.

Choose modes automatically when their triggers materially fit. The user does
not need to remember a command or request a particular ceremony. Use the smallest
compatible combination and change modes when evidence changes the question.
Explicit user preferences override these defaults. Evidence honesty, scoped
authorization and ownership remain applicable across modes.

| Task condition | Preferred method and boundary |
|---|---|
| Small, understood, reversible change | Direct execution and proportional checks; no forced plan, tests, agents or new files. |
| Uncertain product, visual direction, architecture or mechanism | Bounded exploration/prototype; compare materially different options against the same criteria, then harden what is retained. The engineering orchestrator and frontend design guidance support this. |
| Unknown cause or failed attempted fixes | Hypothesis debugging: predict a discriminating observation, inspect the actual sequence, and repair the supported cause. Do not require a predetermined architecture or mistake mitigation for proof. |
| Stable behavior with meaningful regression cost | Contract test first or characterization first for legacy code; observe the intended failure, implement, then refactor. A missing test runner is a choice to resolve; never delete useful code for test-first purity. |
| Substantial implementation with understood interfaces | Scoped delivery, independent delegation when useful, and checkpoints sized to the work. A dependency plan is appropriate here. |
| Changed identity/tenant, trust, persistence, retry or migration boundary | Proportional risk review or threat modeling; inspect abuse/partial-failure paths. Use established context and ask only for material unknowns. Authentication does not prove authorization. |
| Multi-session work or expensive rediscovery | `resumable-work` plus ECC operations when durable dependencies or handoffs justify execution state. Reuse existing project records; use native hooks and user-requested scheduling where applicable. |
| Consequential comparison or revisiting a recommendation | `research-synthesis`: independent-origin evidence, serious alternatives, strongest objection, and dated reusable findings. |
| ML/game-AI/backtest experiment | `experiment-cycle`: cheap exploratory probes, then a pre-specified comparison on untouched evidence when making a confirmatory claim. |

## Specialist skill routing

Select installed skills automatically when their capability is a material part of
the task; an explicit skill name is optional. Use only the relevant specialists,
read their instructions before the corresponding work, and carry their names and
paths into delegated briefs. Repository conventions and existing authorization
remain authoritative. A skill is guidance, not permission for new external actions.

| Work being done | Automatically applicable guidance |
|---|---|
| Substantial comparison, deep research, or reconsidering a recommendation | `research-synthesis`; primary evidence and independent origins, a real counterargument, reusable sourced conclusions. |
| Long task, context recovery, or expensive state to rediscover | `resumable-work`; extend the existing task record before creating a new one. |
| Design/run an ML, simulation, game-AI, or backtest experiment | `experiment-cycle`; distinguish exploratory decisions from confirmation on untouched evidence. |
| Diagnose or fix failing/pending GitHub Actions PR checks | `gh-fix-ci`; inspect actual check state/logs, respect current authorization, and do not call pending or skipped checks green. |
| Parser/validator boundaries, serialization round trips, state invariants, or shrunk generated-test failures | `property-based-testing`; choose meaningful properties and the project's appropriate test layer. Do not force a new library for ordinary example tests. |
| Search elsewhere for a confirmed bug's root-cause pattern | `variant-analysis`; establish the first cause and keep the search within the requested scope. |
| Assess research, benchmark gains, evaluation validity, leakage, or causal claims | `scientific-critical-thinking`; especially game AI, OSRS backtests, and biomedical work. Preserve each project's manifests, baselines, and holdouts. |
| Evaluate prompts, tools, coding agents, skills or LLM workflows | `agent-evaluation`; fixed cases and graders, capability/regression evidence, comparable resets and budgets, task/trial denominators, cost and latency. Synthetic checks are not measured project benefit. |
| Review ML prediction readiness, promotion or train/serve mismatch | `production-ml-review`; point-in-time data, artifact identity, preprocessing parity, finite metrics, fallback and rollback. Does not initiate training, fresh holdout evaluation or deployment. |
| Evaluate or maintain agent harnesses and installed skills | `workflow-audit`; explicit inventory, pinned source, useful method deltas, side effects, hashes, rollback and realistic pilots. Inspect concrete runtime effects and verify host support; use approved hooks/services where useful. Do not mine transcripts into global rules or infer permission/model changes. |
| Create or edit an actual `.ipynb` experiment/tutorial | `jupyter-notebook`; do not convert ordinary script work into a notebook. |
| Create or substantially revise a web interface, or investigate its quality | `frontend-design`; use design exploration, measured performance, release audit or browser regression modes only when applicable. Preserve the stack unless evaluating an alternative is part of the task. Tiny copy/CSS fixes need no full workflow. |
| Review or repair web modal naming, focus, containment, close paths, or restoration | `dialog-accessibility`; reuse established accessible components. |
| Verify web keyboard navigation and focus behavior | `keyboard-navigation-review`; use available browser/project tooling and distinguish observed behavior from static inference. |
| Guard a verified accessibility repair against recurrence | `accessibility-regression-test`; pick the narrowest meaningful behavior test and report manual-only checks honestly. |
| Edit Obsidian-specific note syntax | `obsidian-markdown`; the existing `obsidian` skill owns canonical placement, indexes, and cross-note propagation. |
| Create or edit an Obsidian `.canvas` | `json-canvas`; use existing visualization tools for generic diagrams and plotting tools for scientific figures. |

## Writing and communication

Use principle -> rule -> one-line rationale. Prefer compressed named concepts over long explanations. Teach through contrastive examples: “instead of X, say/do Y.” Be terse about ceremony and generous with the why. Lead with the outcome, then show the evidence and the next action.

Separate planning from implementation. A planning result should leave a clear scope, first task, acceptance criteria, and dependencies. An implementation closeout should say what changed, what was actually verified, what remains unverified, and exactly what happens next.

## Session protocol

### Start

1. Inspect the workspace and the evidence relevant to the task: branch/worktree, diff, pertinent history/files/docs, and runtime/endpoints/data when the question depends on them. Do not turn every start into an unrelated system inventory.
2. Read the durable instructions in this note, the project note under `Project Management/Projects/`, and the repository's `ai-docs/AGENTS.md` or equivalent. Read active memory, branch memory, contracts, decisions, and common-mistakes docs when present.
3. Check the live tracker and active PR/review context when the project uses Linear or GitHub. Treat tracker state and code state as separate evidence; call out mismatches.
4. Identify the source of truth for each claim before changing anything: code, tracker, contract, runtime, artifact, or user decision.
5. Select the working method and identify the next useful action, acceptance criteria, verification level and any actual external boundary. Write a dependency plan when it adds value; proceed with already-authorized work without a redundant confirmation gate.

### Work

- Keep the work within the requested outcome and current experiment/change boundary. Revise a provisional plan when evidence warrants it; do not silently widen the task into nearby cleanup.
- Verify incrementally: compile/test after meaningful changes, then smoke-test behavior that can fail outside the compiler. Never call “builds” equivalent to “works.”
- In a shared repository, use an isolated worktree when practical. Commit early and commit per green step; do not commit known-red states.
- Preserve source and state ownership. Put new code, state, contracts, and docs with the component that owns them; split docs only when responsibilities are genuinely mixed.
- For stateful or destructive behavior, use dry-run/report-only modes, explicit guards, atomic validation, and an operator-visible reason for every skipped action.
- Keep editable drafts separate from polled live state. Polling may refresh status and raw data, but must not overwrite a dirty draft without an explicit load/reset/apply action.
- Use subagents for useful independent investigations, competing prototypes or disjoint implementation/review work. Keep one accountable integrator and preserve consequential findings in the existing task artifact. Do not add an external tracker comment unless that write is authorized.
- When a behavior, interface, durable decision, or repeated mistake changes, update the relevant project `ai-docs` file before the session ends.

### Closeout

Independently verify the result instead of trusting an agent or tool self-report. Update the live tracker and durable docs when they are in scope. Use one consolidated status rather than a stream of partial updates. The checkpoint must be resumable by someone who did not watch the session.

Use this closeout shape:

```text
Status: [current verdict]
Changed: [files/system behavior]
Verified: [commands, endpoints, screenshots, runtime observations, or artifacts]
Not verified / deferred: [boundary and reason]
Next action: [one concrete next step or user test]
```

Commit clean checkpoints. Pushes, PRs, new Linear projects, and other shared external mutations require the concrete change list to be proposed and confirmed when they are not already explicitly in scope.

## Verification vocabulary

Keep these labels distinct:

- **Diff hygiene** — intended files only; no accidental or secret-bearing changes.
- **Compiled only** — the code/build gate passed; runtime behavior is not established.
- **Unit-tested** — focused automated tests passed.
- **Endpoint-tested** — a live service/API returned the expected contract.
- **Browser smoke-tested** — the user-facing surface loaded and exercised against the live/local endpoint.
- **Live-tested** — behavior was watched in the real runtime or game, not inferred from transport or logs.
- **Deferred intentionally** — the gap is known, bounded, recorded, and not being misrepresented as complete.

“Launched,” “process exists,” or “`/status` responds” is not the same as live-tested. A healthy logged-out state can also make widget-dependent exports empty; ask the user to log in when live state is required before interpreting that emptiness as failure.

## Source-of-truth boundaries

- **Personal, home, and admin planning** — this Obsidian vault is now the source of truth. Treat Notion content as historical unless the user explicitly asks for a Notion update.
- **This Obsidian vault** — durable cross-project preferences, project conventions, architecture summaries, and decisions that should survive a session.
- **Repository `ai-docs/`** — project-specific operating manuals, active memory, contracts, decision logs, common mistakes, and verification procedures. The repo's `AGENTS.md` is normally the entry point.
- **Linear** — live task state: what is in flight, status, priority, ownership, and the current next action.
- **Git/GitHub** — code history, branches, PRs, review state, and CI evidence.
- **Runtime, endpoints, logs, and saved artifacts** — what the system actually did. Prefer this evidence over a report that was not independently checked.

Obsidian should link to live tracker state instead of copying a fast-changing task timeline. Repository `ai-docs` should explain how the system works and why; Linear should explain what is currently happening.

## Documentation and consolidation

- Consolidate near-duplicates and thin stubs when the meaning is clear. Preserve real information and historical “why,” but do not preserve clutter 1:1.
- Keep a short current summary at the top of durable docs. Move superseded detail into an archive rather than deleting useful history.
- Add a common-mistake or policy entry when the same failure appears twice. Repeated preferences belong in durable docs so they do not need to be re-asked.
- Do not split a note merely because a category might exist someday. Split when a file mixes responsibilities, becomes hard to read every session, or needs a stable standalone contract.

## Obsidian structure

The vault already has the guide’s useful pieces; keep them simple:

- `Home.md` is the Home MOC. Existing `Index.md` files are area hubs. Use them for navigation, not as databases of every detail.
- Keep broad life-area folders. Folders provide predictable note types and retrieval; links handle cross-cutting relationships. Do not flatten the vault into one folder or create duplicate notes just to represent multiple topics.
- `Project Management/` is the durable project-working layer. `Project Management/Projects/` contains active Linear-backed project control notes. The older `Projects/` folder contains standalone ideas, PRDs, and historical/content notes. When both exist, link the active control note to the older content note instead of duplicating live state.
- `Journal/` is the natural home for dated reflections. Daily Notes is already enabled; do not create a daily-note ritual or another plugin workflow unless it reduces real capture friction. If daily capture becomes routine, point it to a clearly named Journal subfolder.
- Capture first: use a descriptive title, record the source, write the useful thought, and add one or two obvious links. Organize during review. Use tags sparingly for type/status and explicit links for relationships; do not create tags solely to imitate MOC links.
- Avoid plugin/setup churn. Add or change a plugin only when its benefit is concrete and worth the opportunity cost.
