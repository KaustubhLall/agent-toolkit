# Source provenance

**Review date:** 2026-10-03. This candidate is original guidance synthesized from the linked official API documentation. No upstream skill text or code was copied. The linked APIs evolve; check the project’s installed versions before applying version-sensitive details. These references are evidence for specific upstream behavior, not validation that this skill improves an agent or project.

## Gymnasium

- [Environment checker](https://gymnasium.farama.org/api/utils/): explicitly says `check_env` checks that an environment follows Gymnasium’s API, validates observation/action spaces, and calls reset, step, and render with varied values. The skill therefore treats it as a stateful checker and confines it to a disposable instance; broader wrapper/collector/replay claims are our recommended checks, not claims about checker coverage.
- [Handling Time Limits](https://gymnasium.farama.org/main/tutorials/handling_time_limits/): distinguishes MDP termination from external truncation, says no bootstrap at termination and bootstrap at truncation for external time limits, and notes finite-horizon tasks must expose remaining time to preserve the Markov property. The skill additionally tells the agent to derive bootstrap from task semantics rather than flag names alone.
- [Release notes](https://gymnasium.farama.org/gymnasium_release_notes/index.html) and [Gymnasium v1.0 release notes](https://farama.org/Gymnasium-v1.0): describe vector autoreset modes and version changes in how final observations and reset observations are surfaced. The skill instructs checking the installed version/mode before tracing collector/replay values.
- [Action wrappers](https://gymnasium.farama.org/api/wrappers/action_wrappers/): documents `RepeatAction` reward accumulation and stopping when termination or truncation occurs. Probe recommendation is to test the wrapper’s actual composition effects.

## TorchRL

- [`check_env_specs`](https://docs.pytorch.org/rl/stable/reference/generated/torchrl.envs.check_env_specs.html): checks specs against a short rollout; docs state it sets the environment seed, cannot generally restore its RNG state, and should be used offline, not in training scripts. The skill records seed/reset/step side effects and does not require this dependency.
- [Vectorized and parallel environments](https://docs.pytorch.org/rl/stable/reference/envs_vectorized.html): recommends checking specs before parallel use because specs define buffers and must match runtime inputs/outputs. This motivates checking at the vectorization boundary, not only the base environment.
- [Multi-agent environments](https://docs.pytorch.org/rl/main/reference/envs_multiagent.html): documents per-group and global done/terminated/truncated specs and recommends `check_env_specs` after construction. The skill requires distinguishing per-agent from global meaning when applicable.

## PettingZoo

- [Environment tests](https://pettingzoo.farama.org/content/environment_tests/): describes API, parallel API, seed, max-cycles, render, performance, and saved-observation tests. Its API tests run cycles and its seed tests reset/run environments; skill guidance therefore restricts such checks to disposable local instances and avoids using performance output as a correctness verdict.
- [Parallel API](https://pettingzoo.farama.org/main/api/parallel/): states that the parallel API steps every live agent at once and returns per-agent observations, rewards, terminations, truncations and infos. This grounds the simultaneous-action fixture; do not impose that API on an environment with different semantics.

## Installation and license boundary

This candidate defines no runtime dependencies and recommends no third-party skill import. If the project already uses one of these libraries, use the installed version’s documentation and existing checker where useful; otherwise implement the contract check in the project’s existing test style. No permission to copy text or code from unrelated repositories is implied.
