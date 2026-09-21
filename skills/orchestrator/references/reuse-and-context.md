# Reuse and context retrieval

Before a new dependency, helper, integration or subsystem, search local code,
tests, manifests and existing tools for the behavior. Reuse evidence from an
earlier search if still current. Do not turn a tiny edit into ecosystem research.
For a consequential choice, compare adopt, extend/compose and build against the
same requirements: behavior, stack, maintenance, license, transitive execution,
data access, migration cost and failure handling. Popularity is a lead, not proof.

Inspect the actual implementation, pinned version and current primary docs.
Use installed connectors and project-native tools where appropriate; discovering
a server or package is not authorization to install or configure it. Report an
unavailable search channel separately from a search with no suitable result.
Implement the simplest suitable option and record why it beats the strongest
alternative. A repairable flaw can justify a bounded adaptation rather than
discarding the entire approach.

For unfamiliar code, search broadly enough to discover project terminology,
then evaluate relevance and refine the missing question. Include tests, callers,
schemas and negative evidence; do not exclude tests from retrieval by default.
Return file paths plus why they matter, known gaps and next discriminating query.
Stop when the required boundary is understood. If searches stop adding evidence,
change source or question; a fixed search count is not a correctness criterion.

Give workers the outcome, relevant owner files, allowed write scope, known
invariants, actual evidence and unresolved questions. A worker may request missing
context. Send focused deltas instead of repeating the full transcript. The
integrator retrieves and checks consequential claims independently.

Adapted from ECC search-first and iterative-retrieval; [provenance](ecc-source.md).


