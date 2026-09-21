# Bounded worker briefs

Use the fields needed for the job; omit empty ceremony.

## Investigation or prototype

```text
Question: <uncertainty to resolve, without prescribing the answer>
Context: <workspace, evidence already obtained, constraints and current alternatives>
Method: <selected mode and applicable skill names/absolute paths>
Boundary: <permitted read/write scope, runtime limits, data to preserve>
Decision criteria: <what would favor or disfavor each option>
Budget/stop: <bounded work and condition for changing approach>
Deliver: <actual observations, artifact paths, tradeoffs, uncertainty, next experiment>
```

## Implementation

```text
Outcome: <observable behavior>
Context: <workspace, baseline, interfaces, prior changes to preserve>
Method: <selected mode and applicable skill names/absolute paths>
Decisions: <settled contracts and data/state ownership>
Write scope: <exact files/directories this worker owns>
Non-goals: <excluded behavior and other workers' ownership>
Execution limits: <permitted tools and mutations; runtime boundary>
Failure behavior: <validation, retries, cleanup, partial outcomes>
Acceptance: <meaningful checks, runtime verification reserved for integrator>
```

Use built-in tools; do not invoke an external coding service. Report a material
scope/interface conflict before proceeding with dependent implementation. Close
with changed paths, checks actually run, gaps and evidence.

## Fresh review

```text
Review <exact diff boundary/files> against <original requirement>.
Read-only: no edits, deployment or commits.
Trace relevant changed boundaries into callers and consumers.
For each finding, cite requirement, file/line, actual failure path and smallest fix.
Check cited code exists. Separate demonstrated failure from a plausible risk.
Report checks actually run and verification limits; do not claim live acceptance.
```


