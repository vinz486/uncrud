# Extraction map

Read-only source inspected on 2026-11-02: the sibling Opinversa repository. No source code, deployment configuration, identifiers, credentials, content or assets were copied. Its working tree was clean during reconnaissance. This map records architectural observations, not a dependency on that repository or permission to run it.

No source license was found during the scoped inspection. Implementations here are new generic code; this map does not claim a legal audit of third-party code. UnCRUD's new code is Apache-2.0; dependencies retain their own licenses.

| Source component | Observed responsibility | Dependencies | Decision | UnCRUD destination | Verification |
| --- | --- | --- | --- | --- | --- |
| `api/DebateController`, `debate/replay/ReplayService` | Explicit command, caller policy, private transaction, receipt | Spring, domain rules, storage | Rewrite | Poll handler/controller; core command contracts | Domain and real emulator API tests |
| `storage/DocumentStore`, `FirestoreDocumentStore` | Typed storage and native Firestore transactions | Firestore SDK, Jackson, domain serialization | Rewrite | Minimal core store + Firestore adapter | Transaction rollback and concurrent commands |
| `storage/ProjectingDocumentStore` | Stage writes, derive views before flushing, commit together | Storage, projection contributors, after-commit workflow delivery | Adapt concept, rewrite implementation | Staged Firestore transaction; explicit pure builders | Private/view versions and atomic rollback |
| `realtime/UiProjections`, feature view builders | Explicit safe DTOs per consumer surface | Feature-owned domain types | Exclude types; rewrite abstraction | `Projection<S,V>` and poll view builders | Projection and Rules tests |
| `realtime/UiProjectionRebuilder` | Rebuild from fresh sources, bounded cursor scans | Domain registries, admin API | Rewrite | Generic reconciler + local operator CLI | Missing view, ahead version and pagination tests |
| `auth/FirebaseTokenVerifier`, `config/StorageConfiguration` | Verify ID tokens, ADC, strict environment boundary | Firebase Admin, IAM, source project allowlists | Rewrite | Boot auto-configuration and runtime validation | Valid/expired/wrong-project/disabled tokens and configuration tests |
| `frontend/src/lib/http.ts`, `api.ts` | Token-bearing commands, cancellation, receipts and recoverability | Auth, application access, feature lifecycle | Rewrite minimal contract | Pure TS HTTP client | Refresh once, preserve key, unknown outcome and identity-race tests |
| `frontend/src/lib/realtimeStore.ts`, `realtime.tsx` | Shared subscriptions, identity isolation, cleanup and generations | React, lifecycle, source UI | Rewrite | `ProjectionStore`, headless hooks/provider | Snapshot/error/refcount/unmount/auth/query tests |
| `frontend/src/lib/firestoreWatch.ts` | Read-only SDK listeners and bounded queries | Firebase, source collection families | Rewrite | Optional Firebase adapter subpath | Real listeners in two browser contexts |
| `firestore.rules` | Deny private reads and all client writes; scoped views | Domain-specific visibility/admin/access policies | Rewrite | Minimal poll/owner Rules | Anonymous/authenticated/owner/non-owner/write-denial tests |
| Hosting/Run configuration and local scripts | SPA proxy, server runtime, isolated emulators | Source-specific projects, service accounts, commercial integrations | Rewrite | Generic templates and owned-process runner | Config validation, local start/cleanup, container build |
| Statistics outbox and workflow delivery | Separate asynchronous domain tasks and aggregation | Task queues, scheduler, editorial workflow | Exclude | No asynchronous projector in v1 | Documented architectural boundary |
| Editorial AI, content, prompts, voice, avatars, access gates | Application domain and business integrations | External AI, source users and assets | Exclude | None | Contamination checks allow source names only in this map |

## Important findings

The primary UI views are generated during source transactions, not by a universal Firestore trigger. Some separate domain tasks use an outbox; that is not evidence that all projections are eventually consistent. The new starter retains atomic source/view persistence and explicitly documents asynchronous browser delivery.

The source's safe patterns are read-before-write, no external effects in retryable callbacks, feature-owned projection DTOs, bounded child collections, source-based rebuilds, token verification, and identity-aware shared listeners. Its domain policies, providers, UI components and project allowlists are deliberately absent here. See the [decision record](decisions/0001-atomic-projections.md).
