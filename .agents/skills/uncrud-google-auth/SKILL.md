---
name: uncrud-google-auth
description: Diagnose developer or coding-agent GCP/Firebase CLI and ADC access, and guide human interactive login. Excludes end-user Firebase Authentication setup.
---

# Developer and agent authentication

Use when a developer, Codex, Gemini CLI or Claude Code needs authorized cloud-tool access or receives authentication/permission errors. The local emulator quickstart needs no login. Read [credential runbook](references/credentials.md) before remote/headless or quota-project work.

## Inputs and prerequisites

Require intended account, project ID, DEV/PROD environment, execution host/container, operation being attempted and allowed diagnostic scope. Check installed CLI versions in the authorized terminal. Do not inspect credential directories or files. Never ask for tokens, passwords, key JSON, authorization codes or screenshots containing credentials.

## Diagnostic procedure

1. Explain the distinction: `gcloud auth login` configures gcloud; `gcloud auth application-default login` configures SDK ADC; `firebase login` configures Firebase CLI. Coding-product login and app-user Firebase Auth are separate.
2. Offer a diagnostic plan first if cloud read access has not been requested. With scope established, inspect metadata only:

```bash
gcloud --version
firebase --version
gcloud auth list --filter=status:ACTIVE --format='table(account,status)'
gcloud projects describe "$PROJECT_ID" --project="$PROJECT_ID" --format='value(projectId,lifecycleState)'
firebase login:list
```

3. If needed, use a scoped read such as `gcloud firestore databases describe --database="$DATABASE_ID" --project="$PROJECT_ID"` or `firebase apps:list WEB --project="$PROJECT_ID"`. CLI success does not verify ADC. Test ADC using the intended SDK application's permitted read; do not print an access token as a test.
4. If credentials are missing, show the relevant login command and stop for the **human** to execute it in a trusted terminal/browser. Continue diagnostics after the human confirms completion; login is not consent for provisioning.
5. For ADC quota-project errors, explain `gcloud auth application-default set-quota-project "$PROJECT_ID"`, its local configuration change and required permission. Have the human approve/configure it. Keep per-command project flags; do not silently switch global projects.

## Agent environments, stops and output

Codex desktop/CLI uses its authorized workspace terminal. Gemini CLI and Claude Code may execute the same diagnostic commands only within their shell permission model. Explicitly load this skill when their discovery differs. Never copy host credentials into a remote environment or disable a sandbox to make login work. Follow current CLI help for human no-browser/remote flows; no codes in chat.

Stop on wrong identity/project, denied terminal access, org-policy restrictions, absent human login or requested impersonation without permission. For 403 report the resource and missing permission; do not grant Owner/Editor. For 401 check credential type/audience/expiry before proposing IAM changes.

Report identity metadata, exact target, tested credential path (CLI versus ADC versus Firebase), checks run, failures and next human action. Dry-run path: show commands without execution. Never claim successful login proves required resource access.

## Official references

- [ADC setup and CLI distinction](https://docs.cloud.google.com/docs/authentication/provide-credentials-adc)
- [Local/headless ADC](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)
- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills)
- [Gemini shell](https://geminicli.com/docs/tools/shell/) and [Claude skills](https://code.claude.com/docs/en/skills)

Reviewed 2026-11-02. Verify installed versions and official flags when used.
