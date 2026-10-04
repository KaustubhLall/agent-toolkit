# Source and adaptation

Adapted from **The Art of Debugging** by **Stas Bekman**,
[pinned skill](https://github.com/stas00/the-art-of-debugging/blob/59a0c5b0535ead08e04d1ec1ba7b410b70ce3434/SKILL.md),
revision `59a0c5b0535ead08e04d1ec1ba7b410b70ce3434` (2026-09-03).
Upstream and this adapted skill are licensed under
[Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/).
The full upstream license is retained in `../LICENSE-CC-BY-SA`.

Changed 2026-10-03: narrower triggers and recipes, Windows versus Linux/WSL
target checks, matched artifacts/symbols, bounded captures, no default kernel
or ptrace changes, no automatic package installation, and more precise claims
about OOM, non-finite diagnostics and GPU timing. No upstream support script,
service or companion ML-engineering package is installed. The local skill has
no executable helper; debugger/profiler dependencies are checked on demand.

Relevant primary documentation, checked 2026-10-03:

- [GDB initialization and startup](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Initialization-Files.html) and [auto-loading](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Auto_002dloading.html).
- [Python cProfile](https://docs.python.org/3/library/profile.html).
- [Microsoft user-mode dump analysis](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/analyzing-a-user-mode-dump-file) and [WinDbg setup](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/getting-started-with-windbg).
- [PyTorch CUDA environment variables](https://docs.pytorch.org/docs/stable/cuda_environment_variables.html).
- [PyTorch CUDA memory management](https://docs.pytorch.org/docs/stable/notes/cuda.html#memory-management).
- [PyTorch anomaly detection](https://docs.pytorch.org/docs/stable/autograd.html#debugging-and-anomaly-detection).
- [PyTorch CUDA Event](https://docs.pytorch.org/docs/stable/generated/torch.cuda.Event.html).

These support tool semantics, not a claim that the tools ran on the user's
projects or that this skill improved reliability. No live runtime, CUDA device
or distributed environment was tested as part of creating this adaptation.
