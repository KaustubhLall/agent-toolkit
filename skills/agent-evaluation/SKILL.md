---
name: agent-evaluation
description: "Design and assess behavioral evaluations for prompts, tools, coding agents, skills, or LLM pipelines. Use when changing an agent workflow or measuring reliability, regression, cost, and latency; not ordinary deterministic unit tests or game-model training."
---

# Agent evaluation

Define the observable outcome and failure costs before choosing a grader. Reuse
the project's eval runner and records. A local fixture or manual behavior record
can be enough; do not install a second runner merely to follow this skill.

Read [evaluation design](references/evaluation-design.md) when designing trials,
comparing harness variants, or interpreting retry metrics.

Separate newly enabled capabilities from regressions to existing behavior.
Pin the prompt/skill and code versions, model, tools, environment, input fixtures,
budget and grader. Start each trial from an equivalent isolated state. Preserve
raw outcomes, including failures and incomplete runs, with private data redacted.
Permission for evaluation is not permission to send messages, spend money, deploy,
access new accounts, train models, or consume reserved holdouts.

Use executable behavior assertions when reliable; string presence is not proof
that code or a workflow works. Use a documented human or model rubric for behavior
that cannot be reduced to an assertion. Inspect disagreements and calibrate model
judgments against concrete examples. Independent review helps expose assumptions;
agreement among agents is not a substitute for a working artifact.

Compare candidates on the same task set, conditions and budget. Report task and
trial denominators, task-level results, forbidden side effects, cost, latency,
timeouts and regressions. Do not report a fixed universal pass threshold or call
three successes a reliability guarantee. Changes chosen on the evaluation cases
make those cases development evidence; reserve untouched cases for confirmation.

Record what would change the decision and the next useful pilot. Small synthetic
forward tests establish bounded behavior only, not real-project productivity.
Use `experiment-cycle` for confirmatory experiment design and
`scientific-critical-thinking` for consequential validity claims when available.

Adapted from ECC's eval-harness and ai-regression-testing at
`934195f955cf0da847d59fcd6f68856bce112d8b`. Attribution: [source](references/source.md).
