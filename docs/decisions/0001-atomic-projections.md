# ADR 0001: atomic materialized projections

Status: accepted, 2026-11-02.

Use one Firestore transaction for a command's private state, affected views and idempotent receipt. Builders are pure; staged writes flush after reads. This matches the observed primary data path while keeping infrastructure small and locally testable.

Do not introduce an event store, database trigger, task queue or background projector in v1. Browser delivery remains asynchronous. Large or cross-system operations need a separate design instead of partial commits hidden behind this API.

Use per-user vote versions to reject stale intentions, monotonic private aggregate versions, and schema-versioned view metadata. Reconciliation reads private sources again in a transaction; it does not replay commands or downgrade ahead views.

Consequences: strong persistence guarantees for bounded operations; hot-document contention at scale; no background lag repair; no global ordering across separate listeners. Counter sharding or asynchronous projection would change the public consistency contract and requires another ADR.
