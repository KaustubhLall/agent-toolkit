# Small RL contract probes

These are design patterns, not required schemas, harnesses, or framework dependencies. Translate them to the project’s current types and test runner. Keep the expected values independent of the implementation under review.

## Terminal target by task semantics

For one transition, derive the target as `reward + gamma * bootstrap * V(final_observation)`, where `bootstrap` follows the task’s MDP semantics:

| Case | Task meaning | Bootstrap | Expected target when reward=1, gamma=0.5, V(final)=2 |
|---|---|---:|---:|
| Goal/death or other actual terminal state | MDP ended | 0 | 1 |
| External time limit on continuing task | MDP continues beyond cutoff | 1 | 2 |
| Intrinsic finite-horizon endpoint | MDP ended at horizon | 0 | 1 |

For an intrinsic finite horizon, the agent may need remaining time in its observation to make the state Markov. Record both `terminated` and `truncated`; flags communicate API events, while the task definition determines the target. In Gymnasium, actual termination means no bootstrap even when truncation also occurs. For custom flags, verify their declared semantics rather than assuming they follow that API.

A useful negative control changes only the bootstrap mask for the external cutoff. The exact target must change from 2 to 1 and the test should fail. Do not train a policy to obtain this answer; compute it directly.

## Final observation versus reset observation

Create a transition whose terminal observation differs from the next episode’s reset observation (for example scalar 7 versus scalar 0). After a terminal/truncated step, check which observation is exposed by each wrapper/vector/autoreset mode, what the collector stores as the ending transition’s next observation, and what observation begins the next episode. A value-target test should consume the final observation when bootstrapping is valid, never the reset observation. Consult the installed Gymnasium version and autoreset mode; do not assume an older `info["final_observation"]` convention or current same-step behavior.

## Whole transition and wrapper composition

Use two or three deterministic transitions with known observations, actions, rewards and episode identity. Compare the declared contract with outputs at the base env, after each consequential wrapper, at vectorization, at collector output and at replay sampling. Useful checks include:

- Observation/action keys, shapes, dtypes and bounds match the declared spaces/specs.
- Reward transforms (clip, scale, repeat/accumulate) match hand-computed values and apply once.
- `reset` starts a new episode without reusing the prior final observation as state; seed replay gives the expected trajectory where deterministic seeding is part of the API.
- Every sampled transition retains the correct `(obs_t, action_t, reward_t, final_obs_t, terminated_t, truncated_t)` alignment and episode identity.
- If action repeat is present, the accumulated reward, final inner observation, and early stop at terminal/truncation match the wrapper’s documented contract.

Check wrappers in isolation when possible and then check the composed pipeline; a valid base env does not prove a valid wrapper or collector.

## Multi-agent lifecycle

For a tiny simultaneous-action fixture with two agents and a hand-authored terminal step, assert the exact live-agent set, action keys accepted, observation/reward/termination/truncation entries returned, and global-vs-agent terminal meaning at reset and after each step. Include one agent that terminates before the other. Its final record may legitimately appear on its death step; inspect the next active/action set separately. Preserve the declared reward vector or aggregate, and complete one atomic joint transition only after all joint actions have been applied. For a sequential/AEC interface, preserve its turn order and explicit substeps instead of translating it into simultaneous steps. If a seed contract exists, run two disposable instances with the same seed and compare the short action/state/return sequence.

Framework checks such as Gymnasium `check_env`, TorchRL `check_env_specs`, and PettingZoo API/seed tests can expose API mismatches, but they exercise/reset/step (and sometimes render/close) environments and cover only their documented contracts. Run them only on disposable local instances after checking version-specific effects. Follow project-specific assertions and acceptance gates in addition to framework conformance.
