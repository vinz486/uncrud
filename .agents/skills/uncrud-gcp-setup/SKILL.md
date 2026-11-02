---
name: uncrud-gcp-setup
description: Plan and guide approved creation of a new Google Cloud/Firebase environment with explicit billing, APIs, Standard Firestore, least-privilege IAM and cost controls. Never provisions implicitly.
---

# Set up a new cloud environment

Use only for a new authorized environment, not to repurpose an existing application's project. Read [resource/IAM plan](references/resources.md) before proposing changes.

## Inputs and prerequisites

Collect separate DEV/PROD project IDs, display names, organization/folder if applicable, billing account, approved region/database location, Auth provider, Hosting site strategy, budget/alerts, repository identity and approver. Unknown values are blocking inputs for affected steps. Check gcloud/Firebase versions and established identity via uncrud-google-auth; no login automation.

## Plan-first workflow

1. Diagnose target existence with `gcloud projects describe "$PROJECT_ID" --project="$PROJECT_ID"`. Distinguish NOT_FOUND from PERMISSION_DENIED; do not assume either means a safe empty project.
2. Show a table of each resource/API/IAM change, target project/region, actor, estimated pricing dimensions, scale/retention settings and recovery approach. Budget alerts are not hard caps. Link current pricing; do not invent a monthly total without usage assumptions.
3. Ask for explicit confirmation of this concrete plan **before** project creation, billing link, API enablement, Firebase registration, IAM changes or database creation. If not authorized, deliver the plan and stop; diagnostics remain read-only.
4. Execute approved steps individually, checking existence/configuration first. Supported provisioning commands include:

```bash
gcloud projects create "$PROJECT_ID" --name="$DISPLAY_NAME" --folder="$FOLDER_ID"
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" --project="$PROJECT_ID"
firebase projects:addfirebase "$PROJECT_ID" --project="$PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com firebase.googleapis.com firebasehosting.googleapis.com identitytoolkit.googleapis.com iam.googleapis.com --project="$PROJECT_ID"
```

Choose `--organization` instead of `--folder` only for the approved parent; omit both only for an approved unparented project. Do not invent parent IDs or enable optional services. Follow the Firestore/Auth/Run/Hosting skills for their approved resources.
5. Verify actual project state, billing association, enabled APIs, database edition/location, identities and narrow IAM bindings. Do not deploy as a side effect of setup.

## Stops and completion

Stop on missing approval, wrong/existing project, billing mismatch, region constraints, org-policy denial, unexpected resources or a required broad role. An ALREADY_EXISTS result is not permission to modify the resource: inspect it and confirm ownership/configuration. Never delete cloud resources to reset a failed step.

Output actual resources/permissions created, verified state, cost controls, unresolved prerequisites and remaining deploy actions. A dry run is a command/resource plan only; most gcloud mutation commands do not have a universal dry-run flag.

## Official references

[Projects](https://docs.cloud.google.com/resource-manager/docs/creating-managing-projects), [Firebase project setup](https://firebase.google.com/docs/projects/learn-more), [service enablement](https://docs.cloud.google.com/service-usage/docs/enable-disable), [IAM](https://docs.cloud.google.com/iam/docs/overview), [budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets), [Run pricing](https://cloud.google.com/run/pricing), [Firestore pricing](https://cloud.google.com/firestore/pricing), [Firebase pricing](https://firebase.google.com/pricing).

Reviewed 2026-11-02; recheck permissions, pricing, available locations and flags before use.
