# Credential decision runbook

| Symptom | Inspect | Human action, if needed |
| --- | --- | --- |
| No active gcloud account | `gcloud auth list` metadata | `gcloud auth login` |
| CLI works; Java SDK says ADC unavailable | Intended runtime environment, not credential file content | `gcloud auth application-default login` on that host |
| ADC quota denied | Approved quota project and `serviceusage.services.use` permission | Authorized quota-project configuration; request precise missing permission |
| Firebase CLI unauthorized | `firebase login:list` locally | `firebase login` |
| Remote environment cannot open browser | Installed command `--help`, trusted human terminal availability | Supported no-browser/remote bootstrap flow |
| Cloud Run app denies a Firebase user | ID-token audience, end-user Auth and domain policy | uncrud-firebase-auth, not developer IAM login |
| Cloud resource returns 403 | Exact permission/resource, API status and organization policy | Request narrow permission or report policy block |

Headless: `firebase login --no-localhost` is a human flow. Google CLI supports command/version-specific browser/bootstrap options: inspect both `gcloud auth login --help` and `gcloud auth application-default login --help`, then have the human use the supported flow in trusted terminals. Do not transport bootstrap codes in chat or place refresh tokens in CI secrets. Browser login on the host does not imply remote-container SDK access.

Impersonation is not a fallback. If explicitly authorized, document the target service account, caller, scope and token-creator permission before proposing the official impersonation flow. Never create a JSON key to sidestep a policy or headless issue.

CI uses short-lived GitHub OIDC/WIF; Cloud Run uses its attached runtime account. Token refresh inside an SDK is normal credential use, but token values must never be logged. Reports can name an account or project when relevant, but omit private credential paths and contents.
