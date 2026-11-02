---
name: uncrud-backend-development
description: Implement or change UnCRUD Java domain commands, typed private persistence and atomic projections with explicit authorization, idempotency, versions and source-based reconciliation.
---

# Develop server behavior

Use for new application commands/domain handlers, projection contracts and Spring endpoints. Not a generic CRUD generator. Read the target AGENTS.md and [server API guide](../../../docs/server-client.md#server) plus [architecture](../../../docs/architecture.md).

## Inputs and prerequisites

Establish actor/permission policy, intention, private state, expected versions, idempotency scope, resulting safe views, reader audiences, cardinalities and failure semantics. Use Java 25/Gradle; inspect existing contracts/tests before changing them. No cloud access is required.

## Procedure

1. Define typed domain/request/view records. Keep uncrud-core independent of Firebase, Spring and serialization. Add an abstraction only for a demonstrated reusable responsibility. Do not expose private records as HTTP/read-model DTOs.
2. Controller validates bounds and obtains Identity from FirebaseIdentity.require. Handler enforces domain ownership/membership/status from verified identity and private sources. UI visibility and caller-supplied UID are not authorization.
3. Implement Command/CommandHandler. Scope Idempotency.execute by UID and stable operation; canonicalize the full relevant payload deterministically. Capture clocks/IDs before transaction callbacks; no external effects inside callbacks because Firestore may retry.
4. Read sources and policy dependencies first. Build affected views with pure Projection builders and stage private/view writes plus receipt together. Use private versions for concurrency; do not read projection counts as authoritative. Reject stale intent; do not overwrite newer state on retry. Keep no-op behavior explicit.
5. For growing data use child documents and bounded pages. Respect conservative adapter limits and native Firestore limits; fail atomically rather than splitting an ostensibly atomic command into hidden partial commits.
6. Add schema/source metadata and source-based reconstruction for new views. Coordinate mixed-version rollout and refuse unsupported schema downgrades. Document consistency, transaction scope and uncertain outcomes.
7. Update consumers/decoders, Rules, indexes and docs together. Remove replaced code after checking dynamic entrypoints/serialization. Keep stable error codes and safe messages; do not log tokens or private payloads.

## Commands and verification

Run `./gradlew test`, `./gradlew build`, `npm run test:integration`, and involved E2E scenarios. Test permitted/forbidden actors, invalid input, duplicate key/same payload, duplicate key/different payload, stale versions, concurrent writers, transaction rollback and reconstruction. Verify core runtime independence. No source-reference builds or cloud writes.

## Stops and completion

Stop to resolve requirements when a change needs external effects, asynchronous consistency, tenant membership policy, destructive migration or an unapproved cloud resource. Do not silently add an event store, task queue, broad IAM permission or public maintenance API. Explain actual failures rather than weakening validation.

Output changed behavior/contracts, transaction/authorization boundaries, tests actually run and remaining limits. Use an ADR for consistency/infrastructure changes. Official references: [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Firebase token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Boot requirements](https://docs.spring.io/spring-boot/system-requirements.html). Reviewed 2026-11-02; recheck versions/options as needed.
