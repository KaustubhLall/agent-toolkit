# Source and rename

This staged entrypoint consolidates the current Codex
`devin-swe-orchestrator` and its shared references with the useful method
fragments reviewed from ECC 2.2.2 at pinned revision
`934195f955cf0da847d59fcd6f68856bce112d8b`. The local skill is named
`orchestrator` because it is an operations capability in the
planned `ecc-workbench` plugin, not a claim that the historical Devin name or
the upstream Claude runtime is present.

Retained methods include task-conditioned mode selection, local-first reuse
search, iterative context refinement, one accountable integrator, conditional
worker delegation, evidence-shaped closeout, state/diagnostic boundaries,
approval fencing, and lazy detailed-library loading. Claude slash commands,
the `invoke_devin.ps1` launcher, automatic hook installation, transcript
observation, and global configuration mutation were intentionally omitted from
this staged copy. Hooks, services, MCP, schedulers, and control panes remain
conditional choices governed by current authorization and verified availability.

The source and license metadata are preserved in `SOURCE.json` and
`licenses/obra__superpowers.txt`. This file records the rename and boundary so
future updates do not silently restore the obsolete launcher or platform
assumptions.
