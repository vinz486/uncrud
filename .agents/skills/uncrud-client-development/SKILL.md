---
name: uncrud-client-development
description: Integrate or evolve UnCRUD TypeScript HTTP commands and headless React auth/projection hooks while preserving realtime lifecycle, identity isolation and receipt/read-model separation.
---

# Develop client behavior

Use for application hooks, projection decoders, HTTP commands and React consumers. Read [client API guide](../../../docs/server-client.md#client). Do not add a required design system or domain authorization/calculations to the toolkit.

## Inputs and prerequisites

Identify command endpoint/input/receipt/error contract, Firebase project/database, projection path/query/decoder schema, identity/reader policy and loading/offline/confirmation UX. Require Node 24 and installed workspace dependencies. Keep new UI styling in the app; library hooks remain headless.

## Procedure

1. Inspect existing server/view contracts and Rules. Validate projected fields and schema versions in a decoder; TypeScript casts alone do not validate network data. Query filters/order/limit must be explicit and Rules-compatible.
2. Keep `createClient` and `AuthSource` independent of React; use the Firebase adapter subpath only when needed. Create stable auth/client/provider instances. Use explicit decoder IDs and database/resource/query identities for sharing.
3. Use useProjection/useProjectionQuery for state; useCommand for intentions. Render loading, missing, ready, cache and error states. Never use HTTP success payload as a second copy of read-model truth or optimistically compute authoritative counts/policy.
4. Preserve one listener per equivalent identity/resource with reference counting. The last cleanup unsubscribes. Identity/query changes immediately clear previous-context data; discard old callbacks and command completions. Test React StrictMode and unmount/race scenarios when touching lifecycle.
5. Let Firebase handle transient reconnect. Surface terminal errors and resolve auth/rule/index failures before remounting; do not blindly retry permission-denied. `fromCache` describes source metadata, not guaranteed network status.
6. For commands, acquire ID tokens through the SDK; refresh a rejected token once. Preserve exact body + commandId after timeout/network/5xx uncertainty. A new intention after a version conflict uses the latest personal version and a new key. Disable conflicting actions while waiting for required projection versions.
7. Update corresponding server types, Rules/indexes, tests, docs and accessible UI states together. Do not import Firestore write APIs into the product client.

## Commands, diagnostics and completion

Run `npm run build`, `npm run test:unit`, involved Rules/integration tests and `npm run test:e2e`. Verify snapshots, missing/error, shared subscriptions, cleanup, identity/query switches, token refresh, unknown outcomes, two-client updates and mobile keyboard/accessibility behavior. Prefer local emulators; no cloud login is needed.

Stop on mismatched projects, missing reader policy, ambiguous unknown-outcome UX, unbounded queries, unsupported schema or required backend changes that are not aligned. Do not make data public to resolve a listener failure. Report behavior/contracts, tests and remaining limitations; a rendered receipt alone is not proof of realtime confirmation.

Official references: [Firestore listeners](https://firebase.google.com/docs/firestore/query-data/listen), [Auth state](https://firebase.google.com/docs/auth/web/manage-users), [React external stores](https://react.dev/reference/react/useSyncExternalStore), [query Rules](https://firebase.google.com/docs/firestore/security/rules-query). Reviewed 2026-11-02; verify SDK/API behavior at use time.
