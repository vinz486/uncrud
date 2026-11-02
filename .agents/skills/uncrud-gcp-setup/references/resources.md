# Resource and IAM checklist

Use separate DEV and PROD projects by default. Confirm immutable/location-sensitive choices before creation. The supported data architecture uses Firestore Standard Native and Core operations; do not default to Enterprise based on SDK naming.

| Resource | Why | Cost/control |
| --- | --- | --- |
| Project + billing association | Environment isolation | Organization policy and approved billing only |
| Standard Native Firestore | Private state + safe views | Reads/writes/storage/listener fanout; backup/PITR optional |
| Firebase Auth + Web app | End-user identities/config | Provider/pricing/abuse limits and authorized domains |
| Artifact Registry Docker repo | Backend images | Storage/egress; retention policy needs approval |
| Cloud Run service | Stateless commands | Min instances 0; approved max/CPU/memory/concurrency |
| Firebase Hosting site/previews | SPA and rewrite | Storage/bandwidth/preview retention |
| WIF pool/provider | Keyless GitHub deployment | Restrict exact repository ID/owner and environment subject |
| Budget + alerts | Cost visibility | Alerts do not stop spending |

Required APIs depend on chosen steps. Core: Run, Artifact Registry, Firestore, Firebase Management, Firebase Hosting, Identity Toolkit and IAM. WIF adds `iamcredentials.googleapis.com`, `sts.googleapis.com`; Secret Manager and Cloud Build only if approved/used. Do not enable broad service catalogs.

Runtime identity: dedicated service account, `roles/datastore.user` at the narrowest supported scope/condition, Firebase Auth read rights for revocation/disabled-user checks. It does not deploy or change IAM. Deployment identity: Artifact Registry writer, Cloud Run developer/admin rights required by the selected public-invocation configuration, and Service Account User on the one runtime account. Public-invocation/IAM changes can require additional permissions; plan them explicitly rather than escalating during a failure.

Hosting deployers need selected Hosting permissions. Rules/index deployers need corresponding Firebase Rules/Firestore index permissions; do not grant them to every runtime. WIF requires `roles/iam.workloadIdentityUser` on the deploy account scoped to the exact approved external principal. Do not use service-account keys, wildcard repository trust, Owner or Editor.

Diagnostics: `gcloud services list --enabled --project="$PROJECT_ID"`; `gcloud billing projects describe "$PROJECT_ID" --project="$PROJECT_ID"`; `gcloud iam service-accounts list --project="$PROJECT_ID"`; database/Run/Artifact Registry describe commands. Review only the intended project and report missing access rather than changing it automatically.

Rollback is resource-specific: an API disable, project deletion or IAM rollback can break other resources. Capture approved changes and previous IAM/revision state; never promise full automatic rollback of provisioning. Billing and database-location mistakes require stopping for the owner.

## Approved resource commands

These are mutations, not a diagnostic script. Inspect each target first and execute only the individually approved changes. Collect actual account/repository names before substituting variables.

```bash
gcloud iam service-accounts create "$RUNTIME_ACCOUNT_NAME" --display-name="$RUNTIME_DISPLAY_NAME" --project="$PROJECT_ID"
gcloud iam service-accounts create "$DEPLOY_ACCOUNT_NAME" --display-name="$DEPLOY_DISPLAY_NAME" --project="$PROJECT_ID"
gcloud artifacts repositories create "$REPOSITORY" --repository-format=docker --location="$REGION" --project="$PROJECT_ID"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$RUNTIME_ACCOUNT" --role=roles/datastore.user --condition=None --project="$PROJECT_ID"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$RUNTIME_ACCOUNT" --role=roles/firebaseauth.viewer --condition=None --project="$PROJECT_ID"
gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" --location="$REGION" --member="serviceAccount:$DEPLOY_ACCOUNT" --role=roles/artifactregistry.writer --project="$PROJECT_ID"
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_ACCOUNT" --member="serviceAccount:$DEPLOY_ACCOUNT" --role=roles/iam.serviceAccountUser --project="$PROJECT_ID"
```

The two runtime project bindings above are acceptable only for the explicitly approved dedicated application project; review conditions/narrower permissions if databases or identities are shared. Do not paste these blindly into a shared environment. Choose the required Run deployment role separately, considering whether the service already exists and whether public-invocation configuration changes are needed. Do not default to project-wide run.admin merely because a narrower deploy path failed.

Firebase Web app creation, when approved: `firebase apps:create WEB "$DISPLAY_NAME" --project="$PROJECT_ID"`. Record its returned app ID, then `firebase apps:sdkconfig WEB "$APP_ID" --project="$PROJECT_ID"` for public web configuration. Auth-provider enablement is a separate step. Neither this command nor the app generator enables authentication or reserves npm/Maven namespaces.
