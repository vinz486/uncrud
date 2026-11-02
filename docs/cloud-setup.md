# Cloud setup checklist — not executed automatically

Local development needs no cloud setup. Use the operational skills when you explicitly want a new deployment. This repository has not created projects, enabled APIs, configured IAM/billing or deployed resources.

## Agree on a concrete plan

Record application name, distinct DEV/PROD project IDs, organization/folder constraints, billing account, chosen Cloud Run/Firestore region, Firebase Auth provider, Hosting site and runtime/deployment identities. Region selection can affect latency, availability and migration cost; confirm it before database creation. Use Firestore **Standard Native**, not an inferred Enterprise default. Start with `(default)` unless a named-database requirement is explicit; named databases need matching Rules/index and client/server configuration.

Review current pricing for [Cloud Run](https://cloud.google.com/run/pricing), [Firestore](https://cloud.google.com/firestore/pricing), [Firebase](https://firebase.google.com/pricing), Artifact Registry, network egress, builds and logs. Read/write/listener fanout, retained receipts, backup/PITR and preview sites can incur costs. Alerts-only budgets do not cap spending; evaluate any currently supported spend-cap option separately. Set approved budgets, instance bounds, retention policies and alerts. Obtain confirmation for the exact resources/cost plan before provisioning.

## Authorized provisioning sequence

1. Authenticate the human CLI/ADC identities as described in [agent auth](agent-auth.md); inspect the target project read-only first. Do not silently reuse another application's project.
2. If authorized, create the new project under the agreed parent, link the approved billing account and register it with Firebase. Check for existing resources first and reuse only an exact matching authorized configuration.
3. Enable only required services: `run.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `firebase.googleapis.com`, `firebasehosting.googleapis.com`, `identitytoolkit.googleapis.com`, `iam.googleapis.com`. WIF setup additionally needs IAM Credentials and STS; Secret Manager or Cloud Build only if those capabilities are selected. API enablement is a real mutation requiring approval.
4. Create the Standard Native database in the chosen location; create the Firebase Web app; enable the approved Auth provider and authorized domains. The anonymous starter requires anonymous Auth enabled in cloud, and deserves an abuse-control decision before public use.
5. Create dedicated runtime and deployment service accounts. Runtime needs `roles/datastore.user` on the intended project/database scope and Firebase Auth read permission for revocation/disabled-user verification (commonly `roles/firebaseauth.viewer`). Do not grant Owner/Editor. Scope database access with supported IAM conditions where applicable and verify the exact permission behavior.
6. Create Artifact Registry and grant the deploy identity only necessary image-write, Cloud Run deployment and `iam.serviceAccounts.actAs` rights on the runtime identity. Hosting deployment and Rules deployment are separate responsibilities; add only those selected. Configure WIF subject conditions for the exact GitHub repository/environment.
7. Build and validate locally; deploy Rules/indexes before exposing browser data, then the backend and SPA using the operational skills. Never run the sample seed in cloud; implement an authorized application initialization path for real data.

## Configuration and deploy contract

The backend image listens on `$PORT`; the sample defaults to `8181` locally and the container to `8080`. Configure `UNCRUD_ENV=dev|prod`, exact `UNCRUD_PROJECT_ID`, `UNCRUD_DATABASE_ID` and explicit origins. ADC comes from the attached runtime service account. Do not set emulator variables or mount a service-account key.

Build the SPA with explicit `VITE_FIREBASE_*` and `VITE_FIRESTORE_DATABASE_ID` values in the frontend's build environment. Firebase Web config identifies a project and is not a server credential. Never put server secrets in `VITE_*`. The same-project web Auth, backend verifier and Firestore project must match. CORS cannot fix wrong token audiences.

Use [Firebase Hosting + Cloud Run](https://firebase.google.com/docs/hosting/cloud-run): `/api/**` rewrite before the SPA fallback, backend network-public with app ID-token validation. Keep React on Hosting. Hosting previews may still point to the configured live backend; choose an isolated DEV service and verify pinning/rollback before sharing. Direct Cloud Run URLs remain protected by application auth; rewrites are not a security boundary.

Templates are under `deploy/`. `scripts/prepare-hosting.mjs` renders a local config with explicit project/service/region, without deploying. The optional GitHub workflow has an `.example` suffix and cannot run until deliberately configured and enabled. Confirm production environment protection in GitHub before enabling it.

## Verification, rollback and recovery

Verify deployed project, database edition/location, service account, image digest, env, startup probe, health, unauthenticated command rejection, authenticated domain behavior and Rules using non-sensitive test accounts/data approved for that environment. Review logs for authorization errors and tokens; never include tokens in reports.

For backend rollback, list revisions and restore traffic to a known revision with compatible schemas. Hosting rollback/preview promotion follows its release history; keep backend pinning in mind. Rules/index rollback must be reviewed independently. Back up private data and test restoration into an isolated target before migration. The supplied reconciliation CLI is local only; a cloud operator path requires explicit target validation and authorization. No public rebuild endpoint is provided.

Completion must distinguish resources actually provisioned/deployed from templates and dry runs. Each later mutation—billing, API, IAM, database, Auth provider, deploy, backup/export—requires authorization covering that action.
