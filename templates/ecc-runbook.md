# Portable ECC Workbench

This is a source bundle of the locally adapted ECC Workbench, with private
machine and migration references removed. Upstream ECC is pinned by SOURCE.json.
The upstream MIT license is preserved in LICENSE-ECC.txt.

From this directory:

```sh
node scripts/library.cjs search "python api testing" skills
node scripts/library.cjs stats
npm ci --ignore-scripts --no-audit --no-fund
node scripts/runtime.cjs --project /absolute/project/path status
```

Library retrieval requires only Node.js. The execution-state runtime requires the
locked npm dependencies; the root installer does not fetch them automatically.
Runtime database writes belong to the selected project's .ecc/ directory.

The installer exposes only the two small library and operations entrypoints.
All reference skills remain on demand. Original hooks and install scripts are
retained as source for review, but are not activated by the bundle installer.
Native plugin installation and hook trust must be configured separately in a
compatible host. Do not run upstream installers to repair this curated bundle.

Re-run the bundle installer to update managed files. It refuses unexpected local
edits. Uninstall removes only unchanged managed outputs; runtime project state
is outside its ownership. File counts and structural tests do not demonstrate
workflow productivity or model performance.
