---
name: uncrud-local-testing
description: Build and verify UnCRUD with isolated Auth/Firestore emulators, Rules tests, Java/TypeScript tests, generated-app validation and a two-client browser scenario without cloud credentials.
---

# Local checks and diagnostics

Use for verification, local starter startup and failing tests. Read [local guide](../../../docs/getting-started.md). Never use reference-repository services/data to make tests pass.

## Inputs and prerequisites

Identify changed contracts/subsystems and requested test scope. Require Java 25, Node 24, npm dependencies and installed Chromium for E2E. Initial dependency/emulator downloads need internet; actual app verification uses demo-uncrud only. No GCP project/account, ADC, billing or Docker is required for the normal gate.

## Commands

```bash
npm ci
npx playwright install chromium
./gradlew build
npm run build
npm run test:unit
npm run test:integration
npm run test:e2e
npm run skills:check
npm run verify
```

Choose focused tests while iterating; the complete gate is required for cross-cutting contracts/infrastructure and handoff. `verify` builds, checks skills/config, runs unit tests, generates/builds an independent app, starts owned emulators, runs Rules and Java integration tests, then starts backend/frontend for browser tests. It performs no cloud mutation or login.

## Procedure

1. Inspect Git state and preserve pre-existing work. Select Node 24 explicitly if the shell defaults to another version. Inspect command exit codes; do not infer success from an old report.
2. Stop your own dev run before emulator tests. The runner checks dedicated ports and refuses occupied ones; never attach to or kill an unknown process. It supplies both loopback emulator hosts and demo project to its children.
3. Start `npm run dev` for manual checks. Open the poll and an isolated/private context. Confirm one vote updates both views, personal selections remain isolated and prohibited access fails. Ctrl+C stops this run's processes only.
4. For failures read `.local/*.log`, Java reports or Playwright traces. Expected Rules denials are passing negative tests when assertions pass. Failed startup, missing browser libraries and download errors are environment blocks, not passed tests.
5. For skill changes run structural validation and a realistic diagnostic/local scenario. For generator changes run `node scripts/test-scaffold.mjs`; it previews without writes, refuses overwrite, builds the generated app and removes its temporary directory.
6. Check `git diff --check` and credential/source-contamination validation. Confirm owned processes stopped and no tracked generated artifacts or secrets leaked.

## Stops and output

Stop on real-project IDs, non-loopback emulator addresses, wrong runtime, occupied ports, cloud credential prompts or attempted external resources. Do not bypass runtime guards, disable tests or weaken Rules. Classify failures versus blocked checks and rerun only after an actual correction.

Report commands actually run, current outcomes, relevant report paths and concrete limits. Separate emulator token verification from live production cryptographic/IAM verification. `npm run verify` success is local evidence, not a deployment claim.

Official references: [Emulator setup](https://firebase.google.com/docs/emulator-suite/install_and_configure), [Rules unit testing](https://firebase.google.com/docs/rules/unit-tests), [Playwright](https://playwright.dev/docs/intro), [Gradle testing](https://docs.gradle.org/current/userguide/java_testing.html). Reviewed 2026-11-02; check current versions/options when updating tooling.
