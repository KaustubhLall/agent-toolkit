# Select an observation by domain

These recipes require the actual target tools and a task-owned artifact location.
They are optional methods, not a setup script. Read current documentation for
the installed tool version before unfamiliar or version-sensitive actions.

## Native crash or hang

Confirm executable/build identity, architecture, core/minidump provenance and
matching symbols. Start with stacks and loaded modules; collect local variables
only if they are needed and within the capture scope. Missing symbols or a core
from another executable do not support an exact source-line diagnosis.

For an existing Linux core, a bounded GDB example is:

```sh
gdb --nh --nx -iex "set auto-load off" --batch \
  -ex "set pagination off" -ex "info files" \
  -ex "thread apply all bt" --se /path/to/matching-binary --core /path/to/core
```

Disable initialization/auto-load for unfamiliar artifacts; do not call inferior
functions while inspecting a core. Keep the output in the task record, with
sensitive frames/paths redacted for external sharing. Live attach/debugger
execution is a different operation: check target identity, pause behavior and
existing authorization. Do not enable system-wide core dumps or relax ptrace
settings as a default workaround. On Windows, use the existing WinDbg/Visual
Studio dump workflow and matching PDBs when available; do not apply ELF commands
to a Windows dump. Core/dump files can contain credentials and application data.

For a hang, a stack snapshot is evidence at one instant. Capture a small bounded
sequence if necessary, compare thread states and ownership of the wait, and
correlate with the operation's timeline. Intentional idle threads are not a
deadlock diagnosis. A CPU profile alone can miss critical off-CPU waiting.

## Python identity or performance

Record `sys.executable`, the relevant module's `__file__` and available package
version without dumping the whole environment or importing an unfamiliar
side-effectful module. Compare with the intended checkout and task's lockfile.
Installing an editable package is a possible repair, not a diagnostic default.

For a disposable reproduction, built-in `cProfile` can expose Python cumulative
time. It executes the supplied program and adds instrumentation; use only an
authorized reproduction and do not treat those timings as final benchmarks.
`py-spy` is optional when already installed: scope a dump/record to the intended
PID, inspect privileges and output effects, and distinguish observer overhead.
Do not relax OS tracing security to make the tool work. Avoid shell tracing that
expands secrets into logs. Prefer a narrow boundary assertion/stack observation
over deliberately crashing a shared service to prove that a file ran.

## PyTorch and CUDA

Use a disposable input and preserve the original failure. `CUDA_LAUNCH_BLOCKING=1`
for that diagnostic process can localize an asynchronous error, but changes
scheduling and timing. Scope environment changes to the process; do not persist
them in global shell configuration. A CPU reproduction is another backend, not
proof of GPU correctness. Check the current PyTorch CUDA environment-variable
documentation before selecting allocator or debug options.

For OOM, identify whether growth occurs during forward, backward, optimizer or
retained cross-step state. Compare live allocations, reserved allocator memory,
device availability and a bounded memory trace. Reserved-minus-allocated alone
does not prove fragmentation. Do not treat cache clearing or smaller workloads
as a demonstrated root-cause repair. Allocator settings are controlled experiments
only when the evidence and supported version warrant them.

For non-finite results, locate the first failing observation, activation, loss,
gradient or parameter boundary. Check shapes, dtype/device, finite counts and
value ranges without dumping private tensors. Autograd anomaly detection can
help identify a failing backward operation; it is not an all-purpose Inf/NaN
validator and can add substantial overhead. Explicit finite checks and an
independent expected result remain necessary.

CUDA events measure work ordered on their recorded stream. Synchronize the end
event before reading elapsed time and state the measurement boundary; multiple
streams, host work and copies may need additional synchronization/measurement.
Do not infer end-to-end latency from one stream's kernel timing. Profiling with
stacks/shapes/memory can be expensive: keep diagnostic traces separate from
acceptance timing.

For a distributed hang, preserve rank/node identities and compare ranks' stacks
at a matched time. A mismatched collective, rank-specific exception or input
length divergence can look like a network problem. A minimal collective test
is conditional on already-authorized cluster use; do not allocate a cluster or
start a communication service merely to use this reference.

Primary tool documentation and pinned upstream attribution are in [source](source.md).
