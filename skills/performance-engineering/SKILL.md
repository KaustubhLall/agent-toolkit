---
name: performance-engineering
description: Diagnose CPU, memory, throughput, queueing or service-latency problems and verify optimizations with representative measurements and preserved semantics. Use for native kernels, simulation throughput and backend performance; frontend-design owns browser performance.
license: MIT
metadata:
  origin: local-adaptation
  upstream: Mnwa/performance-engineering
---

# Performance engineering

Treat an optimization as a hypothesis. A hot function identifies a location;
it does not establish whether the constraint is repeated work, allocation,
memory bandwidth/latency, instruction dependencies, contention, I/O or queueing.
Choose the smallest investigation that changes the decision. Preserve the
project's stack, acceptance gates and current authorization.

Establish the useful operation and completion boundary, representative inputs,
correctness contract, target/build identity and resource objective. For a new
feature, use an ordinary correct baseline; for an existing complaint, reproduce
it. If execution is unavailable, return supported hypotheses and a runnable
measurement plan, never an invented profile or speedup.

Measure the whole operation as well as its suspected mechanism. Keep setup,
conversion, initialization, retries, errors and retained memory visible when
users pay those costs. For a service, distinguish offered load, useful goodput,
queue delay and response time. CPU samples are not request-wall-time shares.
Do not infer request p99 from batch means or average per-instance quantiles.

Use evidence to choose a transformation: remove work or improve algorithms and
representation before adding specialized SIMD/parallelism where appropriate.
Preserve ordering/ties, numeric behavior, bounds, ownership, ISA dispatch and
fallbacks. Check an independent oracle and boundary cases; sanitizers and heavy
profiling run separately from final timing. An apparently vectorized source
loop is not proof of vectorized machine code or end-to-end improvement.

Use interleaved, meaningfully paired measurements with frozen input/build
identity. Keep every required workload/target case and separate correctness,
memory, quality, tail latency and portability gates. Keep a change only when
the measured benefit earns its maintenance cost. Missing or inconclusive
evidence remains incomplete; do not rebaseline or rerun away a regression.

## Select a reference

Read only the reference that fits the current uncertainty:

| Question | Reference |
|---|---|
| Baseline, workload, pairing, counters, statistical limits | [measurement](references/measurement.md) |
| Critical path, thread states, on/off-CPU, useful work | [systems performance](references/systems-performance.md) |
| Linux process/container/resource diagnostics | [OS diagnostics](references/operating-system-diagnostics.md) |
| Arrival model, p99, overload and recovery | [latency and capacity](references/latency-load-capacity.md) |
| Allocation lifecycle and retention | [allocations](references/allocations.md) |
| Data layout and cache/memory behavior | [memory and layout](references/memory-and-layout.md) |
| Numeric contracts and arithmetic | [computations](references/computations.md) |
| SIMD legality, tails and feature dispatch | [SIMD](references/simd.md) |
| Algorithm choice, Rust or worker scaling | [algorithms](references/algorithms.md), [Rust](references/rust.md), [parallelism](references/parallelism.md) |
| A concrete hypothetical diagnosis | [worked investigations](references/worked-investigations.md) |
| Design budgets and regression ownership | [prevention](references/fast-by-default.md) |

Use existing native tooling on the actual target. Linux `perf`/proc/cgroup
recipes require a verified Linux or WSL target; Windows observations do not
become Linux measurements by translating a command. Check profiler availability,
privileges, overhead and artifact writes. Keep captures in a task-owned location;
do not change host-wide tunables or run additional production load just to use
a reference. Budgets/templates are optional examples, not mandatory artifacts.

## Paired scalar comparator

The reviewed Python 3.10+ stdlib-only helper analyzes supplied samples; it does
not collect benchmarks or prove independence. Use it only for scalar time or
throughput with a project-chosen floor, for example:

```text
python scripts/compare_benchmarks.py <samples.json> --minimum-speedup <agreed-floor> --output <task-report.json>
```

Schema: `schema_version: 1`, `metric: time|throughput`, nonempty `unit`, and
`cases: [{name, pairs: [{baseline, candidate}, ...]}]`. Values must be positive
and finite. Its default minimum pair count is ten, which is an operational
starting point, not a power calculation. Repeated correlated timings are not
independent trials. It returns exit 0 PASS, 1 REGRESSION, 2 invalid input, or
3 INCONCLUSIVE. PASS means only the configured scalar gate cleared; meaningful
improvement and other resource/quality gates need their own evidence.

The CLI requires an explicit floor. Upstream's 0.95 suggestion is not a local
policy: a time-speedup floor of 0.95 permits about 5.263% longer time. The helper
is not a tail-latency, memory, or correctness evaluator. Read [measurement](references/measurement.md)
for pairing and bootstrap limitations before interpreting its intervals.

Adapted from [pinned upstream source](references/local-source.md). Upstream
examples, verifier, icons and historical validation artifacts are not installed;
references to those examples describe upstream material, not local test results.
