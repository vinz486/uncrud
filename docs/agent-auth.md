# Developer and AI-agent credentials

## Three identities, different purposes

| Identity | Used by | How it is configured |
| --- | --- | --- |
| Developer CLI identity | `gcloud` resource administration | Human runs `gcloud auth login` |
| Application Default Credentials (ADC) | Local server Google SDKs | Human runs `gcloud auth application-default login`; cloud uses attached workload identity |
| Firebase CLI identity | Firebase project/Hosting operations | Human runs `firebase login`, or CI uses supported ADC/WIF |
| End-user Firebase identity | Browser access and protected app commands | App signs in through Firebase Auth and sends an ID token |

The CLI does not use ADC for its own requests; see [Google's distinction](https://docs.cloud.google.com/docs/authentication/provide-credentials-adc). Being signed into a coding product, a browser console, Gemini CLI, or Claude Code does not prove GCP/Firebase CLI or ADC authorization. Firebase user ID tokens do not replace Cloud Run IAM invocation tokens.

**The emulator quickstart uses none of these developer logins.** It uses synthetic Firebase users and emulator-only credentials.

## Guided human login

First agree on target account, project, environment and permitted operations. Agents can show commands and diagnose already configured access. Humans complete all browser/device challenges in their own trusted terminal. Never paste passwords, authorization codes, bearer tokens, refresh tokens, key JSON or credential-file contents into chat.

```bash
gcloud --version
firebase --version
gcloud auth list --filter=status:ACTIVE --format='table(account,status)'
gcloud projects describe "$PROJECT_ID" --project="$PROJECT_ID" --format='value(projectId,lifecycleState)'
```

If login is missing, the **human** runs the appropriate command:

```bash
gcloud auth login
gcloud auth application-default login
gcloud auth application-default set-quota-project "$PROJECT_ID"
firebase login
```

Setting an ADC quota project changes local credential configuration and may require `serviceusage.services.use`; obtain authorization and use the intended billing project. Do not switch global CLI project settings for convenience: every operation should carry `--project` explicitly. Inspect `firebase login:list` locally to confirm Firebase identity without requesting token output.

Read-only resource checks:

```bash
gcloud firestore databases describe --database='(default)' --project="$PROJECT_ID"
firebase apps:list WEB --project="$PROJECT_ID"
```

These establish access through their respective CLIs, **not ADC validity**. Confirm ADC by running the intended SDK-based application under its configured identity and checking a permitted read. Distinguish authentication success from IAM permission, API enablement, organization policy and billing/quotas. Never enable APIs or change IAM to make diagnostics pass without approval.

## Codex, Gemini CLI and Claude Code

In Codex desktop/CLI, use the authorized workspace terminal. Do not assume a remote container shares the host's login state; ask the human to authenticate in the exact environment that will run SDKs. Load `.agents/skills/uncrud-google-auth/SKILL.md`; Codex discovers repo skills using [its documented paths](https://learn.chatgpt.com/docs/build-skills).

In Gemini CLI, use an authorized [shell tool](https://geminicli.com/docs/tools/shell/) and explicitly read the same skill if automatic discovery is unavailable. In Claude Code, explicitly load the skill instructions or install them using [Claude's skill conventions](https://code.claude.com/docs/en/skills). Do not automatically modify a user's agent settings or copy credential directories to bridge tools. Shell permission/sandbox restrictions remain in force; a denied login or network command is a stop condition, not a reason to disable policy.

For headless or remote hosts, consult [local ADC guidance](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment), `gcloud auth login --help`, `gcloud auth application-default login --help`, and `firebase login --help` for current remote-flow options. `firebase login --no-localhost` supports a human remote flow. Google CLI remote/browser bootstrap options vary by command/version: select the supported no-browser flow with the human rather than relaying codes through chat. Do not SSH-copy local credentials, use `login:ci` refresh tokens as a shortcut, or impersonate a service account without explicit permission.

For CI and managed workloads, prefer [GitHub OIDC/WIF](https://github.com/google-github-actions/auth) or an attached service account. A production service account should not require interactive login or a downloaded private key.

## Troubleshooting and completion

- `gcloud` works, SDK fails: the CLI identity and ADC are separate; check the application environment and human ADC setup.
- ADC works, quota-project denied: verify the approved quota project and required service-usage permission; report the missing permission rather than granting broad roles.
- `401`: confirm token type, audience/project, expiry and user-disabled/revoked state. Do not log the token.
- `403`: identify the resource and missing permission or organization constraint; authentication may already be working.
- Project mismatch: stop before mutation; verify project IDs in server, web build, CLI flags and selected environment.
- Emulator variables in cloud: remove them from the authorized deployment configuration and revalidate; never bypass the runtime guard.

Completion report: active identity (metadata only), explicit project/environment, checks actually executed, which credential paths were tested, missing permissions, and the next human action. Do not claim access was validated from a successful login alone. Recheck official commands/options when using this guide; references were reviewed on 2026-11-02.
