---
name: uncrud-firestore
description: Design and test UnCRUD private/read-model Firestore storage, Rules and indexes; guide approved database creation, versioned migrations, backups and source-based projection recovery.
---

# Firestore data and recovery

Use for Firestore schema, Rules/indexes, emulator tests, database planning and projection maintenance. Read [migration/recovery runbook](references/recovery.md) for mutations or cloud work.

## Inputs and prerequisites

Require local versus cloud, explicit project/database/environment, edition/location, collection paths, growing cardinalities, allowed reader identities/queries, schema versions and affected operations. For existing cloud state, inspect read-only before proposing changes. UnCRUD v1 targets Standard Native-compatible Core operations; do not silently select Enterprise or assume all Native databases are Standard.

## Procedure and commands

1. Local development uses demo-uncrud. Model private authoritative records separately from minimal shared/owner projections. Growing votes/receipts/history use subcollections; classify read access per document, not per field.
2. Keep handler reads, private writes, projections and receipt in one transaction. Derive versions from private state, not clock order or cached client counts. Reconciliation rebuilds from fresh private state, not replayed commands.
3. Write deny-by-default Rules for the exact documents/queries: authenticated shared reads, UID-owned personal reads, no private reads, no client writes. SDK server IAM bypasses Rules. Align indexes with query order/filter/limits and exempt bulky unqueried fields.
4. Run `npm run test:integration` and relevant E2E tests. Include missing/other-user identity, admin-claim attempts, create/update/delete, bounded queries, concurrency/idempotency and missing/stale/ahead views.
5. For a cloud database, diagnose:

```bash
gcloud firestore databases describe --database="$DATABASE_ID" --project="$PROJECT_ID"
gcloud firestore indexes composite list --database="$DATABASE_ID" --project="$PROJECT_ID"
```

6. Before creation or changing existing Rules/indexes/data, show exact target, edition/location, impact/cost, tests and recovery plan; obtain explicit approval. Approved new creation uses `gcloud firestore databases create --database="$DATABASE_ID" --location="$LOCATION" --type=firestore-native --database-edition=standard --project="$PROJECT_ID"`. Verify flags against installed help. Never create an extra database just because a describe failed.
7. Deploy only approved Rules/index targets with explicit `--project`/`--config`; database selection in that config must match the intended database. Do not deploy emulator defaults to an existing cloud app.

## Recovery, stops and output

The supplied `:starter:backend:reconcile` CLI supports only demo-uncrud and is diagnostic unless `--apply` is explicit; see the runbook. Stop on AHEAD versions, absent private source, incorrect target, unexpected edition, unapproved migration/Rules changes, or query/rule mismatch. No cloud rebuild endpoint is supplied; design an authorized operator path before cloud repair.

Report schema/read boundaries, indexes, actual test results, scan cursor/repair counts and limitations. Do not claim metadata checks repair arbitrary corruption or recover deleted sources. Backups, retention and migrations require deliberate authorization and validation.

## Official references

[Database create flags](https://docs.cloud.google.com/sdk/gcloud/reference/firestore/databases/create), [transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Rules](https://firebase.google.com/docs/firestore/security/get-started), [query security](https://firebase.google.com/docs/firestore/security/rules-query), [indexes](https://firebase.google.com/docs/firestore/query-data/indexing), [backups](https://docs.cloud.google.com/firestore/native/docs/backups), [export/import](https://firebase.google.com/docs/firestore/manage-data/export-import).

Reviewed 2026-11-02; recheck CLI flags, edition availability, pricing and limits at use time.
