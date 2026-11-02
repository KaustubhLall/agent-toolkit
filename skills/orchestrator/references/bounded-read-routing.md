# Bounded read routing

Bound the I/O, not the judgment. The toolkit keeps exact context available for
debugging, architecture, security-critical work, review and edits, while
routing routine large-file orientation to one capped worker request.

## Provider boundary

| Provider | Enforcement | Fallback |
| --- | --- | --- |
| Codex | The ECC Workbench plugin registers a `PreToolUse` gate. Enable the plugin and explicitly trust its current hook definition. | Invoke the bundled reader from this skill. |
| Claude Code | The same `PreToolUse` event shape is supported by Claude Code plugin hooks. Enable and trust the plugin hook. | Use the reader manually when the hook is unavailable. |
| Gemini CLI, OpenCode and generic installs | The portable installer does not assume an equivalent pre-tool permission hook. | Use the reader manually and keep exact reads targeted. |

The root installer distributes skills and the reviewed ECC source bundle; it
does not silently enable native hooks, change model settings or create worker
credentials. Native plugin trust is a separate operator action.

## Use the bounded reader

Run the script from this skill directory with a concrete question and a small
set of paths:

```text
node scripts/bounded-read.cjs --question "Which callers write this cache?" --paths src/cache.ts tests/cache.test.ts
```

The default caps are deliberately conservative: 8 files, a 120,000-byte JSON
worker payload including framing and metadata, 80,000 bytes per file, 80
excerpt lines per file, 400 total validated excerpt lines, 24,000 output bytes
and a 30-second worker deadline. Files over 80,000 bytes with a line over the
16,000-byte line cap are refused before excerpting. Override them per
invocation or with
`ECC_READ_ROUTER_*` environment variables only when the task justifies it.
The script makes one worker call at most; it never fans out a request for each
file.

The worker interface is local and explicit. Set `ECC_READ_ROUTER_WORKER_BIN` to
an installed worker executable and `ECC_READ_ROUTER_WORKER_ARGS` to a JSON array
of arguments. The process receives JSON on stdin:

```json
{
  "protocol": 1,
  "question": "Which callers write this cache?",
  "files": [{"path":"...","line_count":123,"truncated":false,"content":"..."}],
  "limits": {"max_files":8,"max_payload_bytes":120000,"max_output_bytes":24000}
}
```

It must return JSON with an `answer` and `excerpts` containing `path`,
`start_line` and `end_line`; at least one excerpt must validate. The reader
rejects locations outside the provided files, caps each span and the total
returned lines before reading exact local source, and replaces worker-supplied
excerpt text with the exact local source for those ranges. Invalid or
location-free output is an error, not a silent fallback.

The worker is opt-in through `ECC_READ_ROUTER_WORKER_BIN`; the router does not
create credentials or choose a provider. It passes a minimal environment and
refuses common secret paths (`.env`, credentials/secrets directories,
`.pem`/`.key`, `.aws`, `.ssh`) unless an explicit reviewed override and reason
are supplied. Absolute paths and bounded source excerpts are still sent to an
explicitly configured worker, so configure that boundary deliberately.

If no worker is configured, the script returns bounded lexical excerpts and
states that no external model call was made. Treat that output as orientation,
not proof. Follow with a targeted read before editing or making a consequential
claim.

## Full-context fallback

For debugging, architecture, security-critical reasoning, review or an exact
edit, use targeted ranges first. If the complete file is genuinely required,
set both variables for that run:

```text
ECC_READ_ROUTER_ALLOW_FULL_CONTEXT=1
ECC_READ_ROUTER_FULL_CONTEXT_REASON="debugging a suspected cross-file race"
```

The native hook allows the read only when the reason is present and emits it as
a diagnostic. Do not put this bypass in a global profile. If the worker cannot
return exact locations, or the payload would exceed a cap, split the request or
read the specific section directly.

## Provenance and limitations

This is an independent, provider-neutral adaptation of a routing idea described
by Spotify Engineering and the open-source `spotify/portal-ai-plugins` project.
The toolkit does not copy Spotify code, require Portal, or treat the reported
82–94% savings as an acceptance target. The real result depends on task mix,
worker quality, provider latency and the chosen thresholds. Measure local
payload volume and correctness before changing the defaults.

