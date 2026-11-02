---
name: uncrud-cloud-run
description: Build and validate the UnCRUD backend container, then guide an explicitly authorized Cloud Run deployment, verification and revision rollback with explicit project and region.
---

# Backend container and Cloud Run

Use for backend build/deploy, runtime diagnostics or rollback. React stays on Firebase Hosting. Read [deploy/rollback runbook](references/deploy.md) before any cloud write.

## Inputs and prerequisites

Require project/environment, region, service name, existing Artifact Registry repo, runtime service-account email, approved image tag/digest, env file, allowed origins, startup probe and CPU/memory/instance bounds. Confirm application Firebase project matches deployment project. Need Java 25, Docker for a local image, authorized gcloud, and exact registry/Run/actAs permissions. Missing resources route to approved setup, not implicit creation.

## Procedure and commands

1. Local validation needs no cloud approval: `./gradlew build`, `npm run test:integration`, then `docker build -f deploy/cloud-run/Dockerfile -t uncrud-local .`. Review the image and env file; exclude credentials and emulator variables. Do not label a Docker-daemon failure as a successful container build.
2. Diagnose the explicit target:

```bash
gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" --project="$PROJECT_ID"
gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT_ID"
gcloud iam service-accounts describe "$RUNTIME_ACCOUNT" --project="$PROJECT_ID"
```

3. Present image, resources, env/secrets references, runtime identity, public-invocation strategy, costs/scale bounds, affected traffic and rollback revision. Obtain explicit approval before registry push, deploy or IAM/public-access changes.
4. After approval, configure the credential helper if authorized, tag/push the image, resolve its immutable digest and deploy with explicit project/region/account. Follow the exact command in the runbook, adapted only to confirmed inputs. Never distribute a JSON key. Reference Secret Manager versions only if the app actually needs secrets; Firebase Web config is not such a secret.
5. Verify revision readiness/startup probe, expected identity/env/digest, public health, protected command rejection and authenticated behavior with approved synthetic data. Review redacted logs. A health success alone is not domain verification.

## Failure, rollback and output

Stop on wrong project/region/account, emulator settings, missing approval, digest mismatch, policy denial, failed readiness or unexpected traffic change. Diagnose logs before redeploying; do not widen permissions or remove authentication guards. Rollback requires an approved target revision/schema compatibility check and explicit traffic update. It cannot undo committed data migrations.

Dry-run path: local build plus read-only describes and a rendered command plan; do not invent a deploy `--dry-run`. Output image digest, revision, target, runtime identity, checks actually run and unresolved failures. Explicitly distinguish a prepared container from a deployed service.

## Official references

[Container contract](https://docs.cloud.google.com/run/docs/container-contract), [deploy reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy), [public invocation](https://docs.cloud.google.com/run/docs/authenticating/public), [service identity](https://docs.cloud.google.com/run/docs/securing/service-identity), [revisions/rollbacks](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration), [Artifact Registry Docker](https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling).

Reviewed 2026-11-02. Check current flags, IAM and pricing at execution time.
