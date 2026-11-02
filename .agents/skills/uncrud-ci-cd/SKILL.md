---
name: uncrud-ci-cd
description: Maintain UnCRUD GitHub build/test CI and prepare optional explicitly authorized deployment using GitHub OIDC and Google Workload Identity Federation with protected environments.
---

# CI and optional deployment

Use for GitHub Actions verification, preview/release workflows and keyless deployment configuration. Read [WIF and environment checklist](references/ci.md) before enabling cloud steps.

## Inputs and prerequisites

Collect GitHub repository/owner IDs, branches, DEV/PROD environment names and approvers, GCP project numbers/IDs, WIF pool/provider, deploy/runtime service accounts, registry/service/region/site and permitted deployment actions. Confirm ownership rather than assuming namespaces. No cloud identity is required for local CI.

## Procedure

1. Preserve `.github/workflows/ci.yml` as credential-free verification: checkout, Java 25, Node 24, `npm ci`, Chromium installation, `npm run verify`, failure reports. Default token permission is contents:read. Do not skip Rules/E2E checks for an infrastructure change.
2. Validate workflow YAML and run the same checks locally. Tests operate only on owned demo-uncrud emulators. Reports/logs must not include credentials or real user data.
3. The cloud workflow is inert while suffixed `.yml.example`. Render/review concrete configuration before proposing activation. Plan preview/live behavior, exact environment/project, costs, build/image identity, rollback and approval gates. Never deploy pull-request code with privileged credentials or use pull_request_target to run untrusted builds.
4. For WIF provisioning, show exact pool/provider/account IAM changes and obtain explicit confirmation. Restrict issuer/attribute mappings and conditions to the verified repository/owner and intended environment. Grant workloadIdentityUser only to the approved principal, and narrow deployment/actAs roles. No downloaded key or long-lived Firebase refresh token.
5. In the workflow, grant id-token:write only to the deploy job. Authenticate with `google-github-actions/auth` using workload_identity_provider and service_account; follow its current supported runtime/setup-gcloud sequence. The auth action's generated credential file is ephemeral and ignored, never archived or committed.
6. Configure GitHub environment protection before enabling production. Enable the manual workflow only after approval; WIF setup itself does not authorize a deploy. Verify a deployment's actual completion and smoke tests, not just dispatch.

## Commands, stops and output

Local path: `npm ci`, `npm run verify`, `node scripts/validate.mjs`. Cloud diagnostic examples: `gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --workload-identity-pool="$POOL_ID" --location=global --project="$PROJECT_ID"`; inspect the deploy account's IAM policy on the explicit project.

Stop on missing environment protection, wildcard/unverified repository trust, wrong project/region, PR privilege escalation, requested secret-key shortcuts, unapproved activation or missing deploy permissions. Do not broaden IAM automatically. Dry-run is workflow/config review plus local tests and read-only describes.

Output enabled/inert workflow state, permission/trust boundaries, tests run, deployment authorization required and any actual revision/URL only if deployed. Publication to npm/Maven is a separate release workflow and requires verified namespace ownership.

## Official references

[Google auth action](https://github.com/google-github-actions/auth), [WIF deployment pipelines](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines), [GitHub OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect), [environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [workflow security](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).

Reviewed 2026-11-02; recheck action releases, runner/runtime requirements and current permission guidance.
