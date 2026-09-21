# Agent Toolkit development

This repository publishes reusable skills and preferences. Never add machine
configuration, authentication, conversation history, private vault indexes or
project details. `.local/` holds publisher configuration and must stay ignored.

`tools/sync.mjs` owns generated `skills/`, `preferences/`, `plugins/` and
`bundle.manifest.json`. Edit the enrolled source or `templates/`, then sync.
Keep the exporter fail-closed. Never weaken scanning to get a publish through.
Run `npm test` and `npm run verify` before committing code changes.

Installers must preflight the entire operation, preserve unrelated instructions,
refuse local drift, and never install credentials, permission settings, or hooks.
Keep native plugin activation separate from distributing its source.
