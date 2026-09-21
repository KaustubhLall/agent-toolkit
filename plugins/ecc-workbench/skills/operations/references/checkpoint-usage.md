# Checkpoint usage

1. Create or continue the native Codex task/worktree.
2. Upsert a manual ECC work item with the task identifier in metadata.
3. Use `status --json` before and after meaningful work; treat exit codes as attention signals only.
4. Close the item after native tests and review pass.
5. Capture a session snapshot only with an explicit file target and `.ecc` output path.

The runtime is a record and inspection layer. It is not the source of truth for browser acceptance, deployment, model quality, or live service behavior.
