# Using the libraries

## Server

`uncrud-core` exposes `Command<R>`, `CommandHandler<C,R>`, `Identity`, `DocumentKey<T>`, `DocumentStore`, `Projection<S,V>`, `ProjectionMeta`, `CommandReceipt` and `CommandFailure`. Its runtime dependency graph is empty. Firestore adds `FirestoreDocumentStore`, `Idempotency` and `ProjectionReconciler`. Spring Boot auto-configures these and exposes `TokenVerifier`/`FirebaseIdentity` for explicit controller use.

Start with the real implementation in [PollService](../starter/backend/src/main/java/uncrud/poll/PollService.java) and [PollController](../starter/backend/src/main/java/uncrud/poll/PollController.java). To add another command:

1. Define a typed command and validate request bounds in the controller. Derive the caller from `FirebaseIdentity.require`; do not accept a UID as proof of ownership.
2. Implement a handler that loads private sources and permissions inside the transaction. Read authorization dependencies in that same snapshot when concurrency matters.
3. Call `Idempotency.execute` inside the transaction, using an operation scope and a deterministic canonical representation of the payload. Capture nondeterministic identifiers before entering the callback. Never include tokens in a payload fingerprint or log.
4. Build explicitly typed views with `Projection<S,V>`, then stage private state and those views. Throw `CommandFailure` for expected domain errors. All writes and the receipt commit together.
5. Update Rules, indexes, decoders, consumer hooks, tests and documentation together.

Firestore serializes application records through Jackson into native maps. Use explicit records with bounded strings/lists/maps and JSON-compatible scalar values; the starter uses epoch milliseconds for times. Application-specific codecs for other types are not supplied in v1. Avoid cross-domain generic maps as public contracts.

Configure `uncrud.environment`, `project-id`, `database-id` and explicit `allowed-origins`. Boot auto-configuration uses Firebase Admin `verifyIdToken(token, true)`, including revoked/disabled-user checks. Replacing `TokenVerifier` is an application extension point; production replacements must preserve verification properties. No global filter automatically authorizes your custom routes: every protected controller must require identity and enforce domain policy. The health endpoint intentionally exposes only `UP`.

Failures map to `{code,message}`. Common statuses: 400 invalid input, 401 invalid/missing session, 403 forbidden operation, 404 missing poll, 409 stale version/key conflict, 422 oversized operation, 503 unavailable or uncertain commit. Do not return raw Firebase exceptions, stack traces or bearer tokens to clients.

## Client

`createClient({ endpoint, auth, fetch? })` accepts a Firebase-independent `AuthSource`. `command<I,R>(path,input,options)` returns a receipt. Options are `commandId`, `signal` and `timeoutMs`. The client refreshes a rejected token once and checks identity before dispatch. A receipt must match the command ID. `ApiError` includes `status`, `code`, `commandId` and `outcome` (`rejected` or `unknown`).

```ts
const commandId = crypto.randomUUID();
const body = { optionId: 'books', expectedVoteVersion: personalVoteVersion };
try {
  await client.command('/polls/weekend/vote', body, { commandId });
} catch (error) {
  // If ApiError.outcome is unknown, preserve BOTH body and commandId for a retry.
  // A 409 requires a new intention based on the latest view, with a new key.
}
```

`firebaseAuthSource(auth)` lazily subscribes to SDK ID-token changes. `firestoreProjections(database)` creates document/query references. Document decoders receive the native object; query decoders also receive the document ID. Validate schema versions and the fields your UI needs. `decoderId` is part of the shared-listener identity: change it whenever decoder semantics change. Equivalent references with the same key must use equivalent decoders.

```ts
const recent = views.query(
  { path: 'pollViews', orderBy: 'meta.updatedAt', direction: 'desc', limit: 25 },
  decodePollWithId,
  'poll-v1',
);
```

Add required indexes for filtered/ordered queries; test the exact query against Rules. A limit is mandatory and must be 1–100. Rules are not post-query filters: the entire possible result set must be allowed. The library exposes a bounded realtime window, not a pagination UI; the application owns page cursors and lifetime.

Place a stable `UncrudProvider` above consumers with stable `auth` and `client` instances. `useAuth` exposes session status. `useProjection(ref)` and `useProjectionQuery(ref)` return `{status,data,fromCache,error}`. `useCommand<I>(path)` exposes `{execute,pending,receipt,error}`. Keep receipt confirmation separate from rendering projection data. Compare returned versions with observed metadata when a workflow must wait for a snapshot.

The provider and hooks handle subscriptions and identity cleanup; they do not add UI, optimistic domain calculations, persistent offline writes or authorization logic. Terminal listener errors require resolving the cause and remounting the resource/provider; transient reconnect belongs to the Firebase SDK. Other frameworks can use the pure client and `ProjectionStore` directly.
