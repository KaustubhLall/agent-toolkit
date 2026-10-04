# Source and local adaptation

Upstream: [Mnwa/performance-engineering](https://github.com/Mnwa/performance-engineering/tree/1f8c23164f35c4c5868e765753904202ac4fe834),
revision `1f8c23164f35c4c5868e765753904202ac4fe834`, skill version 1.1.0.
Copyright (c) 2026 Mnwa; MIT notice retained in `../LICENSE`.
Reviewed 2026-10-03. The upstream references retain their own historical source
check dates; those dates are not claims of current API verification.

The entrypoint was rewritten for proportional task selection, Windows/Linux
host checks and existing acceptance ownership. References, optional templates
and the paired scalar comparator/tests are retained. Both the comparator CLI and
Python API now require the caller to provide its minimum-speedup policy. The
tests explicitly select their illustrative floor and cover its required API
argument. Upstream teaching
kernels, package verifier, binary icon and validation records are omitted.
Example/validation references point to the pinned upstream material and do not
establish local compilation, ISA coverage or project performance.

The NUMA references add the [Linux kernel memory-policy documentation](https://www.kernel.org/doc/html/latest/admin-guide/mm/numa_memory_policy.html).
Linux sampling instructions state their output-file effects. The helper is
stdlib-only, reads an explicitly supplied JSON input, prints a report and writes
only an explicitly supplied `--output` path. It neither runs the workload nor
contacts a service. Existing profiler tools are optional and must be checked on
the target before use. See `../SOURCE.json` for source identity and changes.
