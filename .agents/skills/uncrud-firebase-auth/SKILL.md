---
name: uncrud-firebase-auth
description: Implement and verify end-user Firebase sign-in, frontend token renewal, backend ID-token verification and authorization/Rules. Excludes developer CLI/ADC login.
---

# Application user authentication

Use for app user sign-in/providers, UID authorization and token-related API/Rules behavior. For developer/agent credentials load uncrud-google-auth instead.

## Inputs and prerequisites

Require project/environment, local versus cloud, provider choice, authorized domains, identity/ownership policy, frontend config and backend audience/database. Decide whether anonymous identity is acceptable; it is not proof of a unique human. Confirm provider credentials/consent requirements with the owner without asking them to paste secrets.

## Implementation procedure

1. Use Auth Emulator locally (`127.0.0.1:9199`, demo-uncrud). The starter signs in anonymously and subscribes to ID-token changes via `firebaseAuthSource`. No real provider or developer login is needed.
2. For email/password, implement actual SDK registration/login/logout flows and error states. For OAuth providers, follow official provider setup and authorized-domain/redirect guidance. Cloud provider enablement is a real configuration change: show the plan and obtain explicit approval first. Prefer the Firebase console's supported provider settings when CLI support is unclear.
3. Retrieve public web config using `firebase apps:sdkconfig WEB "$APP_ID" --project="$PROJECT_ID"` after authorized read access. Set frontend VITE config only for the intended environment; never put service credentials/provider secrets in the browser or .env.example.
4. Obtain a Firebase **ID token** from `currentUser.getIdToken()` for API commands. Let the SDK refresh normally; on a backend 401 refresh once and retry with the same idempotency key. Clear identity-scoped state on logout/account changes.
5. Verify server tokens with Firebase Admin against the explicit project, including expiry and disabled/revoked-user checks. Use the verified UID for server policy; do not trust body UID, email display or UI visibility. Backend ADC/IAM and Cloud Run invocation credentials are separate.
6. Align Rules with the exact identity/ownership model and test token valid/missing/malformed/expired/wrong-project/disabled cases, unauthorized operations, owner/non-owner views, logout transitions and old-token races. Run `npm run test:integration` and `npm run test:e2e`.

## Stops, diagnostics and completion

Stop on project mismatch, unknown provider consent/domain requirements, missing approval for provider/user changes, or emulator flags outside local mode. `auth/unauthorized-domain` needs an approved domain configuration; `401` needs token/audience verification; `403` can be valid identity denied by policy. Do not fix authorization by making Rules public or disabling verification.

Dry-run path: implement/test entirely with Auth Emulator and produce a provider/domain checklist. Output providers actually implemented/enabled, token/UID policy, Rules changes and test evidence. The generator records an email/password preference but does not implement its UI automatically; do not call it complete until exercised.

## Official references

[Web Auth](https://firebase.google.com/docs/auth/web/start), [anonymous](https://firebase.google.com/docs/auth/web/anonymous-auth), [password](https://firebase.google.com/docs/auth/web/password-auth), [ID-token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [session revocation](https://firebase.google.com/docs/auth/admin/manage-sessions), [Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth), [Rules/Auth](https://firebase.google.com/docs/rules/rules-and-auth).

Reviewed 2026-11-02. Verify current provider requirements, SDK versions and options when used.
