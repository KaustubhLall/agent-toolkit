# Native and tool-backed skills

The standalone bundle is portable. Native app skills often call provider tools
that another coding assistant does not have. Redistributing their cache would
not restore those tools, accounts, licenses or permissions.

The original environment also exposed these native skill families:

| Provider or plugin | Restore through |
|---|---|
| Codex system skills: OpenAI Docs, skill creator/installer, plugin creator, image generation | Current Codex installation |
| Computer use and inline visualizations | Codex native plugins |
| Documents, PDFs, presentations, spreadsheets and live Excel | Codex artifact/runtime plugins |
| Google Drive, Docs, Sheets and Slides | Google Drive plugin and account connection |
| Notion | Notion plugin and account connection |
| Adobe Creative Cloud | Adobe plugin and account connection |
| Sites building and hosting | Sites plugin and hosting connection |
| Plugin management and reusable artifact templates | Respective native plugins |
| GitHub and Linear tools used by standalone skills | Their native connector or authenticated CLI |

No native cache, MCP configuration, authentication file or permission policy is
copied. Install the needed integrations in the destination host, then reconnect
accounts. A skill mentioning a connector must first verify that it is available.
ECC Workbench is included separately because its adapted source and permissive
upstream licenses are available locally; hooks still require explicit host trust.
