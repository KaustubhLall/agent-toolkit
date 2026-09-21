# Evaluation design

Use the existing task record to capture only fields that affect interpretation:

| Field | Decision it supports |
|---|---|
| Task population and fixed cases | What the result generalizes to |
| Capability and regression criteria | What improvement and breakage mean |
| Baseline and candidate identities | What actually changed |
| Model/tools/fixtures/environment | Whether trials are comparable |
| Trial budget, retries and reset procedure | Whether extra work explains a win |
| Grader, rubric and adjudication | How outcomes become verdicts |
| Forbidden effects and execution boundary | Whether a successful answer still fails |
| Stopping rule and missing-run treatment | Whether selection biases the result |
| Cost, latency and quality guardrails | Whether the improvement is useful |

For a coding agent, inspect the diff, run behavior tests, and check workspace
ownership. For a retrieval agent, inspect supported answers, citation accuracy
and missed evidence. For an action agent, inspect the actual authorized action
and refusal on out-of-scope input. Keep tests independent of implementation text.

`pass@1` is the fraction of tasks whose first attempt succeeds. Empirical
`pass@k` is the fraction of task groups with at least one success within the same
predeclared k-attempt budget. `pass^k` is the fraction of task groups where every
one of k trials succeeds. Always state reset/retry rules and denominators. A
single task with three successful runs is one observed group, not proof of 100%
future reliability. Do not pool easy tasks or correlated attempts as independent
evidence. If using the unbiased sampled pass@k estimator, name it and its
assumptions instead of silently mixing it with observed retry success.

An absent trial is incomplete, not a pass. Record model errors, invalid outputs,
timeouts and flaky graders separately; declare their treatment before comparing.
Blind model graders to candidate identity when practical and verify consequential
judgments manually. Confidence scores alone do not establish calibrated accuracy.

For a skill pilot, give the evaluator the realistic request, minimum raw inputs,
and candidate skill without the intended answer. Preserve the produced artifact.
Fix observed failures and rerun affected cases; retain the initial failure record.

Sources: [ECC eval-harness](https://github.com/affaan-m/ECC/blob/934195f955cf0da847d59fcd6f68856bce112d8b/skills/eval-harness/SKILL.md),
[Anthropic agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).
Checked 2026-09-20. Provider examples are conceptual; verify current APIs before use.
