# Publishing and restoring

## Source ownership

The original standalone skills and durable preference document remain the
publisher's sources of truth. Only explicitly enrolled skill directories,
selected preference sections and the reviewed ECC package are exported.
`templates/` replaces private vault snapshots and machine-specific runbooks.
Do not edit generated `skills/`, `preferences/` or `plugins/` directly.

Publisher configuration lives in ignored `.local/sources.json`. It contains
absolute source locations, substitutions, private-term rules, enrolled skill
names and reviewed icon hashes. Never commit it. A new clone is a consumer by
default and cannot publish until explicitly configured.

Copy `export.config.example.json` to `.local/sources.json` and fill in your
actual source paths, skill names and approved preference headings. Review the
source files and licenses first. Configure specific substitutions, privacy
terms and overrides; a regex scanner alone cannot classify all private prose.
Keep `requireReview: true`. Use only trusted local configuration.

```sh
node tools/sync.mjs --dry-run
node tools/sync.mjs --review
```

Read `.local/review.md` in full. It contains the prospective public diff. Resolve
any private or project-specific details by narrowing the source sections or
adding a reviewed generic template. Do not bypass a failure by weakening checks.
The preview command returns a fingerprint. Publish that exact snapshot with:

```sh
node tools/sync.mjs --publish --reviewed <fingerprint>
```

If a source changes after review, the fingerprint check fails. The publishing
checkout must be clean, on `main`, with the configured `origin`. Publishing
never force-pushes, rebases or silently merges remote edits. It stages only
generated bundle paths. New skill folders require enrollment and public review.
Existing enrolled skills update automatically; source disappearance is an error.
To intentionally remove a skill, remove its enrollment after reviewing the change.

`node tools/sync.mjs` exports locally without committing. This is useful during
development, but leaves a dirty checkout that must be reviewed and committed
before the automatic publisher can continue.

## Codex automation

Create a recurring Codex task attached to the publisher task, every 15 minutes.
Use the configured repository as the working directory. Its instructions should:

1. Run `node tools/sync.mjs --review`.
2. If there are changes, read the entire `.local/review.md`. Check for personal
   data, project details, secrets, broken substitutions and unexpected files.
3. When the generated changes fit the authorized public bundle, run
   `node tools/sync.mjs --publish --reviewed <returned fingerprint>`.
4. On unchanged content, remain quiet. Notify only on a successful meaningful
   update, failure or required user action. Do not alter source enrollment,
   checks, permissions or configuration merely to clear an error.

The sync also retries a previously validated sync commit after a failed network
push. Keep the original publisher machine available. When moving to a new
publisher, first configure and validate it, then disable the old automation and
create the new one. Task automations are host state and are not cloned from Git.

## Recovery

- **Private-content or credential check:** inspect the named source locally;
  keep sensitive content outside the public export. Output never includes the
  suspected secret value. Reviewed upstream fake fixtures have exact file-hash
  exceptions in `scan-exceptions.json`; any changed fixture requires review.
- **Dirty checkout or failed commit:** inspect `git status` and the diff. Commit
  intended development changes after tests, or repair the export transaction.
  Do not discard user changes to make automation proceed.
- **Remote ahead:** inspect remote changes, then `git pull --ff-only` when clean.
  Divergence requires human integration. Never force-push.
- **Failed push:** the next run can retry only commits with the exact sync
  subject, one parent and generated-only changes, after rescanning their trees.
- **Interrupted export:** caught filesystem errors restore prior bytes. An OS
  crash can leave incomplete output, so verify and compare with Git before
  resuming; the next run fails closed on output drift.
- **Stale lock:** inspect `.local/sync.lock`, confirm its PID is not running and
  that no sync is active, then remove only that lock. Never delete an active lock.
- **Status:** `.local/last-sync.json` records the last completed sync. The native
  automation records failures. No credentials or tokens are stored in this repo.

On consumer machines, pull and re-run the installer. Local edits stop overwrite;
back them up and reconcile them deliberately. OAuth, API keys, native plugin
installation and host-specific hook trust are separate setup steps.
