---
name: research-synthesis
description: "Research consequential comparisons or multi-source questions using primary evidence, source independence, a serious counterargument, and a reusable sourced conclusion. Use for deep research or revisiting a recommendation; not single-fact lookups."
---

# Research synthesis

Start from the user's decision, criteria, constraints, and current uncertainty.
The existing workflow, chosen tool, and prior recommendation are candidates to
test, not an oracle. Distinguish a false claim, a repairable integration cost,
and a genuinely different method worth trying.

## Retrieve, then investigate what changes the decision

Use existing project research first. Check source dates and refresh unstable
facts; a prior summary answering the question does not establish freshness.
Record which prior conclusions were retained, revised, or overturned.

For build-versus-adopt decisions, search local code, tests and installed tools
before external candidates. Compare adopt, extend/compose and build against the
same requirements; inspect pinned source, license, runtime dependencies and
hidden side effects. Separate unavailable search channels from negative results.
Refine retrieval using discovered project terms and specific evidence gaps,
including tests and callers. Stop at sufficient decision evidence rather than a
fixed number of searches. For installed-skill audits use `workflow-audit` when
available. These additions adapt ECC search-first and iterative-retrieval;
see [pinned attribution](references/ecc-source.md).

Break the decision into load-bearing claims. Seek original docs, code, papers,
or data for technical claims. Treat Reddit and YouTube recommendations as leads
and user experiences, not controlled evidence of performance. Say whether a
video was watched, a transcript inspected, or only metadata/summary available.

Count independent origins, not URLs: mirrors, vendor demos, affiliated posts,
and videos repeating one benchmark are one evidence family. Corroborate major
claims where possible; a single authoritative specification may settle its own
behavior. Do not manufacture a second source or search to a fixed quota. Keep
exact versions, dates, units, and denominators when they affect the decision.

Actively develop the strongest competing explanation or alternative method.
Look for known failures, counterexamples, adoption costs, and conditions where
the rejected option wins. Compare parts as well as whole packs. A source flaw
can justify a repair and bounded trial, rather than disqualifying its ideas.

Delegate distinct questions when independent work is useful. Give workers the
question, constraints, source requirements, and write scope. Diverse lanes
improve coverage; agent agreement is not independent empirical evidence. The
integrator checks decisive sources and resolves contradictions personally.

## Deliver a reusable decision

Choose the output structure that serves the question. Include the conclusion,
alternatives and their best use cases, strongest objection, uncertainty, and
what evidence would change the choice. Put source links beside the supported
claims. Separate observed facts, author claims, inference, and untested proposals.

Save substantial reusable findings in the project's existing research location
or the requested workspace. Reuse an existing index; add one only when needed
for discovery. Include checked date and a brief supersession note for changed
recommendations. Do not auto-edit ignore rules or silently replace historical
evidence. Use `resumable-work` only when a separate recovery need exists.

This is a local synthesis of reviewed research methods. It is not the upstream
`/deepresearch` runner and does not install a research service or background job.
