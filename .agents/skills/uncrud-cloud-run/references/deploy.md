# Deployment runbook

The starter Dockerfile consumes the executable jar built by Gradle. Run Java as non-root, listen on `$PORT`, do not bake credentials/config files into the image. The local dev runner is not a container profile: its emulators use host loopback. Container-to-host emulator networking requires a separate reviewed local setup; never point it at cloud to make a smoke test pass.

After an approved plan, example commands with explicitly collected values:

```bash
gcloud auth configure-docker "$REGION-docker.pkg.dev"
docker tag uncrud-local "$IMAGE_TAG"
docker push "$IMAGE_TAG"
gcloud artifacts docker images describe "$IMAGE_TAG" --project="$PROJECT_ID"
```

`IMAGE_TAG` has the approved registry/project/repo/image:tag. Record the resulting sha256 digest as `IMAGE_DIGEST` with its fully qualified image URI. Do not deploy a mutable `latest` without recording what it resolves to.

```bash
gcloud run deploy "$SERVICE" --project="$PROJECT_ID" --region="$REGION" \
  --image="$IMAGE_DIGEST" --service-account="$RUNTIME_ACCOUNT" \
  --env-vars-file="$ENV_FILE" --port=8080 --memory=768Mi --cpu=1 \
  --min=0 --max=2 --concurrency=40 --timeout=60 --no-invoker-iam-check \
  --startup-probe='httpGet.path=/api/v1/health,httpGet.port=8080,periodSeconds=5,timeoutSeconds=2,failureThreshold=20'
```

Resource values above are a small-app proposal, not implicit approval or a spending guarantee; tune them to the agreed plan. `--no-invoker-iam-check` permits network invocation while protected routes still verify Firebase ID tokens. Organization policy may forbid this strategy; stop and redesign with the owner instead of bypassing it. IAM-private Run is a different token/proxy architecture.

Env contains explicit UNCRUD_ENV, project ID, database ID and origins. Secrets use approved Secret Manager version references and `--set-secrets` only when needed; never put secret values in command history or VITE variables. Runtime account uses ADC. Cloud config rejects emulator envs and the demo project.

Verification and rollback commands:

```bash
gcloud run revisions list --service="$SERVICE" --region="$REGION" --project="$PROJECT_ID"
gcloud run services logs read "$SERVICE" --region="$REGION" --project="$PROJECT_ID" --limit=50
gcloud run services update-traffic "$SERVICE" --to-revisions="$KNOWN_GOOD_REVISION=100" --region="$REGION" --project="$PROJECT_ID"
```

The last command is a mutation and requires approval. Capture current traffic before changing it. Check whether Hosting pinTag still routes previews/live traffic to an older tagged revision, and whether schemas support rollback. Never include bearer tokens in curl examples executed through an agent; authenticated smoke tests should keep session tokens in the test process and report only status/outcomes.
