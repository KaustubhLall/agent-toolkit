# GPT usage routing

Use this reference when choosing between Codex and a separate ChatGPT surface for this user's usage-saving strategy. Confirm model and tool availability in the active surface; names and account access can change.

## Route the work

- In Codex, use GPT-6.1 Sol for hard work and GPT-6 Luna for routine work. Avoid Astra for ordinary task routing unless the user explicitly asks for it. Use only models exposed by the active host.
- Prefer ordinary ChatGPT for a bounded review, analysis, or small patch draft when that surface is available and its route is verified not to consume the Codex/Work allowance. Use ChatGPT Pro for a demanding review only when Pro is actually available and it materially improves the result. Do not route through ChatGPT Work to claim Codex savings: Work and Codex share usage. A cloud task or a different model name alone does not establish a separate allowance.
- Before relying on a route, verify the selected surface can receive the needed context and return the requested artifact. Existing-conversation read/send tools do not create an ordinary ChatGPT conversation or select Pro. A connected GitHub tool may create a branch, commit, or PR only when that capability is exposed and authorized for the exact repository; connection presence alone proves neither.
- Keep local editing, tests, runtime observation, long-running jobs, and durable repository state with the environment that can actually execute them. A text review is advisory and cannot certify tests, runtime behavior, or merge readiness. Treat an externally produced patch as a draft: inspect it, integrate it, and run the appropriate local checks.
- Send only a compact handoff: objective, exact files or excerpt, relevant constraints, question, and acceptance criteria. Link to source when access is verified; avoid copying the full conversation or unrelated private context. Existing user authorization carries through only for the same action, payload, and destination; a new external write still needs the applicable authorization.

## Codex-specific Chat-first strategy

When operating in Codex, check whether ordinary ChatGPT Chat can complete a suitable bounded task before spending substantial Codex reasoning on it. Prefer that route for self-contained reviews, synthesis, patch drafts and small GitHub changes when available; use Pro for hard reviews only if actually selectable. Do not substitute ChatGPT Work, a Codex cloud task or a cheaper Codex worker and label it a separate-allowance offload. Outside Codex, do not force a surface switch solely for this preference.

Inspect the actual Chat surface and its exposed GitHub capabilities. A GitHub connector in Codex does not establish that the target Chat has it. Verify repository access and the specific branch/commit/PR operation before assigning executable changes. When available and already authorized, let Chat prepare the patch or open the PR; return its actual artifact/URL, attach created PRs to the Codex task, inspect the diff, and run required host checks. Do not claim a PR was opened from a draft or a connector badge. Keep training, local-only files, accelerator admission and runtime certification on the host that can execute them.

If Chat or Pro cannot be selected, repository tools are missing, or integration overhead would outweigh the bounded work, continue in Codex using Sol 6.1 for hard work and Luna for routine work. Explain the specific limitation once and advise the user of the actionable route, such as opening an ordinary ChatGPT conversation and enabling the repository connector; do not require the user to repeat an already authorized task. Provide a compact handoff if automation cannot reach that surface. Never change permissions, expose unrelated private context, or promise savings without evidence.

## Report savings honestly

After each completed task, or a meaningful batch of related tasks, add a short cost line naming the actual surface and model. Report a token counter only when the surface provides one. Otherwise, state that reasoning usage is unavailable; a visible-text word/token estimate may be shown as such, but it is not Codex usage. Estimate counterfactual Codex tokens saved only from a comparable, locally calibrated Codex task, subtracting handoff and integration overhead; show the method and a range. If there was no verified offload or no defensible comparison, report `0 verified Codex tokens saved; estimate unavailable`. Do not equate cheaper credits, fewer visible words, or moving work to ChatGPT Work with Codex tokens saved. Negative savings are valid when the handoff and integration cost more than the work avoided.

## Routing checks

When reviewing a proposed route, confirm that it handles: ordinary ChatGPT versus ChatGPT Work; unavailable Pro; absent GitHub capability or repository authorization; prompt-only review versus executable/runtime work; a local-only artifact; an offloaded draft that still needs integration; and handoff overhead that exceeds the comparable Codex cost. These are decision checks, not model benchmarks.
Source checked2026-10-13: [OpenAI pricing](https://learn.chatgpt.com/docs/pricing) states ChatGPT Work and Codex share usage. [Chat and Work guidance](https://learn.chatgpt.com/docs/get-started-with-work) distinguishes the two surfaces. Recheck if the product or billing route changes. Do not infer a plan's exact counters from these general docs.
