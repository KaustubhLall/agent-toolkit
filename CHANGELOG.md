# Changelog

## v1.0.0 — 2026-10-03

First stable GitHub release of Kaustubh Lall's portable agent toolkit.

- 28 standalone skills and working preferences with scoped routing guidance and
  implicit-invocation metadata where supported by the host.
- Added `performance-engineering` for representative CPU/memory/backend
  measurements and explicit per-case regression gates. Its optional Python
  scalar comparator requires a chosen floor and does not evaluate p99,
  correctness, memory or policy quality.
- Added `native-runtime-diagnostics` for matched native/Python/PyTorch incident
  evidence, bounded instrumentation and Windows versus Linux/WSL target checks.
  Stas Bekman's upstream attribution and CC BY-SA 4.0 terms are retained.
- Added original `rl-environment-contracts` guidance for reset/step, wrappers,
  autoreset, collector/replay, bootstrap semantics, reward and agent lifecycle.
  It uses existing project interfaces and does not require a new RL framework.
- Expanded `workflow-audit` intake review to include developer-executed tests,
  fixtures, package lifecycles, build helpers and hooks outside its inventory.
- Included the pinned ECC Workbench library and ownership-aware installer for
  Codex, Claude Code, Gemini CLI, OpenCode and generic layouts.

Verification covers export privacy and hashes, installation ownership and
drift refusal, synthetic comparator cases and temporary-home installation.
Cross-platform CI results are recorded on the release commit. These checks do
not establish future skill-selection reliability or measured project benefit.
Native plugins, authentication, hooks and machine settings remain separate setup.

See [THIRD_PARTY.md](THIRD_PARTY.md) for per-component licenses and attribution.
