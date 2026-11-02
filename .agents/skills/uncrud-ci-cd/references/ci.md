# WIF and environment checklist

Keep build/test and deployment trust separate. The active workflow runs only local checks and has no id-token permission or cloud secrets. The optional example is manual, targets a protected GitHub environment and must be configured before renaming. Capture approved project/service IDs in environment variables, not in guessed defaults.

For a new WIF provider, use GitHub's HTTPS issuer and documented attribute mappings. Validate immutable repository/owner IDs where supported, environment/ref conditions and repository-specific principal bindings. Check the exact subject emitted by a job using a GitHub environment; it differs from branch-only subjects. Never trust all repositories from an issuer.

Suggested split: setup administrator configures WIF and approved roles once; deploy identity can push only to the intended registry, deploy the intended Run service and actAs its runtime identity, plus selected Hosting permissions. Runtime identity only accesses application data/Auth. Firestore Rules changes require an explicit additional deployment step/review. See the gcp-setup resources reference for distinctions; verify supported resource scopes/conditions in current IAM docs.

Protect production with reviewers and branch restrictions before any manual dispatch. Store project/region/provider/account identifiers as GitHub environment variables. Never use user-supplied workflow input as shell source; pass it through env and validate it. Restrict workflow_dispatch inputs to meaningful choices. Fork PRs must not access deploy credentials or protected environments.

The auth action supports short-lived credentials and exports its configured environment for tools, including SDK ADC. Check Firebase CLI's current ADC support before using it for Hosting; do not fall back to service-account JSON or `FIREBASE_TOKEN` without redesigning the credential path with the owner. Authenticate after build/test when possible so short-lived credentials do not expire during a lengthy suite.

Rollback is a separately authorized deployment: restore known-compatible Run traffic and the intended Hosting release, accounting for pinTag. Capture old/new image digests and revisions without logging credentials. Upload only approved test/report paths; never upload generated credential files, env files, home directories or arbitrary debug dumps.

## Approved WIF creation example

Use a dedicated trust pool or verify that no weaker provider in a shared pool can satisfy the account binding. Collect PROJECT_ID/PROJECT_NUMBER, POOL_ID, PROVIDER_ID, immutable REPOSITORY_ID/OWNER_ID, the owner/repository slug, ENVIRONMENT and DEPLOY_ACCOUNT. The following changes require explicit approval after showing the resulting trust condition and IAM bindings:

```bash
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project="$PROJECT_ID"
gcloud iam workload-identity-pools create "$POOL_ID" --location=global --display-name="$POOL_DISPLAY_NAME" --project="$PROJECT_ID"
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --workload-identity-pool="$POOL_ID" --location=global --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id' \
  --attribute-condition="assertion.repository_id == '$REPOSITORY_ID' && assertion.repository_owner_id == '$OWNER_ID' && assertion.sub == 'repo:$REPOSITORY_SLUG:environment:$ENVIRONMENT'" \
  --project="$PROJECT_ID"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_ACCOUNT" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository_id/$REPOSITORY_ID" \
  --role=roles/iam.workloadIdentityUser --project="$PROJECT_ID"
```

Choose environment names without special characters or use GitHub's documented subject encoding. Validate all inputs rather than constructing shell source from free text. Before rerunning creates, describe resources and compare issuer/mappings/conditions; existence is not evidence of a correct trust policy. Updating an existing provider or binding needs approval covering its current consumers.

Configure the auth action with the full provider resource name and deploy-account email. Set each environment's GCP/Firebase identifiers to its own project, runtime account, registry, service and Hosting site. The inactive workflow template deliberately omits Rules deployment and data initialization. Its health/401 checks are basic deployment checks; add application-specific authenticated verification using approved test accounts without logging tokens.
