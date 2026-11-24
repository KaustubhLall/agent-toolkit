# Compatibility and evidence

The installer supports Node.js 20+ and the target paths below. It does not install
the assistant executables or transfer account sessions. Authenticate through
the assistant's native flow on each machine.

Current primary documentation checked 2026-09-21:

- Codex [skills](https://learn.chatgpt.com/docs/build-skills) and
  [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- Claude Code [skills](https://code.claude.com/docs/en/skills) and
  [memory/instructions](https://code.claude.com/docs/en/memory).
- Gemini CLI [skill discovery](https://geminicli.com/docs/cli/using-agent-skills/)
  and [GEMINI.md](https://geminicli.com/docs/cli/gemini-md/).
- OpenCode [skills](https://opencode.ai/docs/skills/) and
  [global rules](https://opencode.ai/docs/rules/).

Codex uses `~/.agents/skills`; older existing installations may have standalone
skills under `~/.codex/skills`. Export can read either enrolled root, while new
installs target the current documented location. Claude Code uses
`~/.claude/skills`. Gemini uses `~/.gemini/skills`. OpenCode uses
`~/.config/opencode/skills`. Existing host configuration that overrides these
locations must be reconciled separately.

## Ponytail implementation routing

Ponytail works as an instruction-only skill on the toolkit's existing install
paths. A routine coding request can select it directly. On a larger change,
the orchestrator gives the implementing worker the skill and active level.
Either can consult ECC for a concrete question such as migration compatibility.
One owner looks up the method and shares it. This also works with the portable
`ecc-library` entrypoint installed on a machine without the native plugin.

The useful part of the upstream method is the order of decisions. Trace all
callers and establish the contract first. Then try existing project code,
platform facilities and installed packages before adding an implementation.
An earlier upstream experiment found that explicitly searching callers caught
a broken sibling path that general advice to trace the flow had missed.
[Upstream caller-tracing experiment](https://github.com/DietrichGebert/ponytail/blob/ebd8654c2c627f721eb8f9c0d1bd4090a29f9e10/benchmarks/results/2026-06-22-issue-245-217-comprehension.md)

The toolkit carries the core method and optional review, audit and shortcut
reports. Mode and opt-out travel in conversation context and worker briefs.
Upstream's lifecycle hooks, codebase map, Claude activity dashboard and session
history import belong to its full plugin. Its published cost and time figures
come from its Claude Code benchmark. [Upstream measurement and limits](https://github.com/DietrichGebert/ponytail/blob/ebd8654c2c627f721eb8f9c0d1bd4090a29f9e10/benchmarks/results/2026-10-07-agentic.md)

In one paired local trial, two fresh workers received the same CSV seat-zero
bug and identical fixtures. The worker given the skill and the baseline worker
both fixed the shared helper and added a regression test. Each passed all 15
output checks across CSV, roster and ticket callers, including legacy empty
fields. Both approaches solved this case. Cost and latency were unmeasured.

## Bounded read routing

The ECC Workbench plugin includes an opt-in-by-trust `PreToolUse` gate for
large full-file reads. Its defaults are 350 lines or 50,000 bytes, with small
targeted ranges allowed through. Codex and Claude Code expose compatible
permission-decision hook events, but plugin hooks still require explicit trust;
the toolkit installer does not register a Claude plugin automatically, so
Claude users must enable the documented hook path manually.
Gemini CLI, OpenCode and generic installs are not assumed to expose the same
gate; the portable orchestrator skill provides the manual bounded-reader path.

The reader makes no provider or credential assumption. Without an explicitly
configured worker command it returns bounded lexical excerpts locally. With a
worker it makes one capped request, validates returned file locations and
replaces worker text with exact local excerpts. Debugging, architecture,
security-critical reasoning, review and exact edits retain a justified
full-context or targeted-read escape.

Skills remain source instructions. Host-specific tool names, integrations,
model choices and execution facilities are conditional on actual availability.
Imported agent briefs and recipes do not create native subagents or slash
commands. The ECC wrapper skills link to complete source folders so relative
support files remain intact.

Automated tests cover file installation, updates, ownership, conflict handling,
uninstall, template rendering, privacy checks and export determinism. CI tests
Windows, macOS and Linux. These are structural/integration checks; successful
agent invocation and every tool-backed workflow are not certified by them.
