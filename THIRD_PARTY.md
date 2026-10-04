# Source and licensing

The harness, working preferences and integration design are Kaustubh Lall's
work. Upstream patterns were selected and adapted to fit that existing system.
Credit below applies to imported methods and content; it does not attribute the
surrounding harness to the upstream projects. See [AUTHORSHIP.md](AUTHORSHIP.md).

Original bundle tooling, templates, the locally authored Obsidian and
`rl-environment-contracts` skills, and public preference adaptation are MIT
licensed; see LICENSE. This does not relicense third-party content.

Each imported skill retains its available SOURCE.json, source references,
copyright and license files. The distribution manifest hashes the actual public
bytes. Upstream source manifests describe upstream originals and can differ
from a locally adapted entrypoint; they are not claims that adaptations are
verbatim originals.

- ECC upstream corpus and source methods: MIT, Affaan Mustafa;
  upstream `affaan-m/ECC` commit `934195f955cf0da847d59fcd6f68856bce112d8b`.
  `plugins/ecc-workbench/SOURCE.json` pins the vendored originals. The exporter
  checks those originals before applying public transformations.
- The ECC Workbench host adapters, curated entrypoints and harness integration
  are Kaustubh Lall's work, incorporating the credited upstream methods. The
  public plugin metadata identifies Kaustubh as its author and this repository
  as the distribution; SOURCE.json separately identifies upstream ECC.
- OpenAI-sourced skills: preserve their accompanying LICENSE.txt and source
  manifests. Several local installed copies do not include a pinned upstream
  source manifest; the bundle's SHA-256 manifest records their exported bytes.
- Notion knowledge-capture, meeting-intelligence and spec-to-implementation:
  MIT, Notion Labs, Inc.; license text retained in each folder.
- `property-based-testing` and `variant-analysis`: upstream CC-BY-SA-4.0;
  attribution, source revision and license retained in each folder. Their
  derivative material remains under that license.
- `native-runtime-diagnostics`: adapted from Stas Bekman's *The Art of Debugging*,
  commit `59a0c5b0535ead08e04d1ec1ba7b410b70ce3434`, **CC-BY-SA-4.0**. Its
  derivative instructions and recipes remain under that license; the full
  license, author credit, source identity and adaptation notice are retained.
  The root MIT license does not replace these ShareAlike terms.
- `performance-engineering`: adapted from Mnwa's package at commit
  `1f8c23164f35c4c5868e765753904202ac4fe834`, MIT. The upstream copyright and
  license are retained alongside source/adaptation notes. The paired scalar
  comparator and tests are adapted code, not original benchmark measurements.
- `rl-environment-contracts`: original guidance by Kaustubh Lall, grounded in
  linked Gymnasium, TorchRL and PettingZoo documentation. No upstream skill
  text or implementation was imported; framework dependencies are optional.
- Other skill-specific MIT/Apache notices, including accessibility, frontend,
  scientific-thinking and Obsidian syntax sources, remain next to the material.
- `obsidian` is a locally authored skill with public vault placeholders.
  Other local adaptations preserve the source notices they originally shipped.

Public transformations replace the private vault snapshot and layout with generic
templates, remove private migration-record paths, generalize project examples
and machine paths, and replace the personal ECC runbook with a portable one.
No imported executable is run merely because it appears in the bundle.
