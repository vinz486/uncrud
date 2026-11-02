# Migration and recovery

## Local operator path

While the owned local emulators are running:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 \
./gradlew :starter:backend:reconcile --args='--project=demo-uncrud'
```

Default is diagnosis. Add `--apply` to the arguments to repair missing/stale views from current private state. Each poll/vote is reread transactionally. Cursor pages contain at most 25 source documents; scans do not store all votes in memory. AHEAD is preserved and requires reviewing deployment/schema compatibility. Repeating a completed repair is idempotent.

Limitations: only existing sources are enumerated, so not every orphan is discovered; counts are copied from authoritative private aggregates, not recomputed from all voter documents; identical-version payload corruption is not detected. The generic reconciler can delete an orphan when explicitly given its source/view keys, but the CLI does not scan every view. Do not present this as backup recovery or an all-corruption audit.

## Versioned schema migration

Describe old/new private and projected shapes, version mapping, readers/writers during rollout, cardinality and indexes. Capture backup/restore procedure for the actual target. Build a bounded migrator with cursor/checkpoint and transactionally recheck the latest source before each write. Test retries, concurrent commands, deleted sources, partial progress and reruns in an isolated emulator dataset.

Increase projection schema version when meaning/shape changes. Coordinate decoders/builders and do not mix incompatible writers during rolling deployment. Never use projected data as the only source for recovery. No source backward-compatibility/migration tool is provided automatically; add it only for a concrete application requirement.

## Cloud approval boundary

Confirm project/database/edition/region via describes. Review exact Rules and index diff and negative tests. A deploy example is `firebase deploy --only firestore:rules,firestore:indexes --project="$PROJECT_ID" --config="$REVIEWED_CONFIG"`; inspect database entries in that config first. Named database entries must be explicit and point to the correct rules/index files. Rules can remove legitimate access; index changes can create costs or block queries while building.

Backups/PITR/export/import incur costs and contain sensitive data. Confirm retention, destination bucket/location/IAM, encryption needs and recovery objectives. Never export user data to a public bucket or developer checkout. Test restoration to an isolated approved database/project and verify authorization before cutover. Imports, TTL, deletes and automated retention are separate mutations, not default cleanup.
