# Runtime contract

The adapter exposes only four bounded surfaces:

* `work-item list|show|upsert|close|claim`: local ECC SQLite state.
* `status`: JSON status against the same project-local database.
* `doctor`: read-only ECC install-state diagnosis for the host/project context; an empty result does not certify project health.
* `session-inspect`: an explicitly named existing file, with optional project-local output.

The upstream scripts are vendored unchanged under `vendor/scripts`. The adapter supplies the project root and database path, redirects session recordings to `.ecc`, and rejects output paths outside `.ecc`. It does not expose upstream installer, repair, update, provider, network, memory, hook, or tmux execution commands.
