# Agent Toolkit

**Created and maintained by [Kaustubh Lall](https://github.com/KaustubhLall).**

This is my coding-agent harness: the working preferences, orchestration, skill
routing, ownership boundaries and verification practices I developed for my work.
I adapted selected patterns from ECC and other projects to fit that system.
This repository packages the reusable parts for sharing and machine setup.

A portable, public copy of my reusable coding-agent skills and working preferences.
Install the same bundle into Codex, Claude Code, Gemini CLI or OpenCode. Keep
personal data, credentials and machine configuration outside the repository.

## Set up a new machine

Install Git, Node.js 20 or newer, and your chosen coding assistant. Sign in to
that assistant using its own authentication flow. Then:

```sh
git clone https://github.com/KaustubhLall/agent-toolkit.git
cd agent-toolkit
node tools/install.mjs --targets codex,claude --apply
```

No npm dependencies are needed for the installer. Omit `--apply` to preview.
Restart the assistant or reload its skills after installing. Existing instructions
are preserved around a managed block. Existing, differing skills stop the
installation before writes. Backups and ownership receipts stay on your machine.

Optional targets and vault configuration:

```sh
node tools/install.mjs --targets gemini,opencode --apply
node tools/install.mjs --targets codex,claude --vault /path/to/private/vault --apply
node tools/install.mjs --targets generic --apply
```

| Target | Skills | Global instructions |
|---|---|---|
| `codex` | `~/.agents/skills` | `~/.codex/AGENTS.md` |
| `claude` | `~/.claude/skills` | `~/.claude/CLAUDE.md` |
| `gemini` | `~/.gemini/skills` | `~/.gemini/GEMINI.md` |
| `opencode` | `~/.config/opencode/skills` | `~/.config/opencode/AGENTS.md` |
| `generic` | `~/.agent-toolkit/skills` | `~/.agent-toolkit/AGENTS.md` |

The generic target creates a portable copy for tools with configurable skill or
instruction paths; configure that tool to read these paths. It does not claim
that every agent understands every provider-specific tool name in every skill.

## Included

- All 25 enrolled standalone skills, including supporting scripts, examples,
  references and original licenses.
- Reusable working preferences: evidence, project ownership, skill routing,
  communication, recovery, documentation and proportional verification.
- ECC Workbench: 292 reference skills, 68 agent briefs, 94 recipes and 122 rules
  at the pinned upstream revision in `plugins/ecc-workbench/SOURCE.json`.
  Two small entrypoint skills expose this library without loading it all at once.
- SHA-256 distribution manifest, an ownership-aware installer, a public export
  pipeline, tests, and CI on Windows, macOS and Linux.

Public copies use generic vault templates. Personal biography, project lists,
employer information, vault snapshots, conversation history, authentication,
MCP tokens, permission settings and model/account configuration are excluded.
Native app/plugin skills require their provider's tools; see
[native plugins](docs/NATIVE-PLUGINS.md) for restore boundaries.

## Updates

The configured publishing machine is checked every 15 minutes by a Codex
automation. It previews the approved source changes, reviews the sanitized diff,
then commits and pushes verified updates. It stops for private content, newly
discovered skills, changed binary assets, local edits or diverged Git history.
It runs while that machine and Codex automation runner are available; GitHub
cannot observe files on an offline computer.

On a receiving machine, update with:

```sh
git pull --ff-only
node tools/install.mjs --targets codex,claude --apply
```

Use the same target list you installed. [SYNC.md](docs/SYNC.md) explains how to
enroll another publishing machine, move the automation and recover after a stop.
One publisher is intentional; this is not an automatic two-way merge system.

## Verify and remove

```sh
npm test
npm run verify
node tools/install.mjs --uninstall
node tools/install.mjs --uninstall --apply
```

Uninstall preserves locally edited files and instructions outside the managed
block. It does not remove private vault data or project execution state.

The ECC search tool is dependency-free:

```sh
node plugins/ecc-workbench/scripts/library.cjs search "python testing" skills
```

The optional execution-state runtime needs its locked dependencies installed
with `npm ci --ignore-scripts` in `plugins/ecc-workbench`. Hooks and upstream
install scripts are included for inspection and are not enabled by this installer.

See [AUTHORSHIP.md](AUTHORSHIP.md) for authorship and the direction of adaptation,
[THIRD_PARTY.md](THIRD_PARTY.md) for upstream credit and licenses, and [compatibility](docs/COMPATIBILITY.md)
for documentation sources and verification boundaries.
