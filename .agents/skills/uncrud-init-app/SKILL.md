---
name: uncrud-init-app
description: Create an independent UnCRUD Java/Spring and React app in an empty directory, recording explicit cloud preferences without provisioning or deploying.
---

# Initialize an application

Use for a new application based on this repository. Do not use to overwrite an existing app or initialize cloud resources.

## Inputs and prerequisites

Collect application name, absolute destination, Java/Spring + React stack acceptance, region preference, separate DEV/PROD project IDs if known, Firebase user-auth preference and Hosting strategy. Unknown cloud values stay null; never invent resources. V1 supplies one stack and Hosting + Run routing. For a different stack, stop and propose a separate template change.

Read the source repository's AGENTS.md. Require Node 24 and an existing real destination parent. The destination must be absent or an empty directory outside the template repository; symlinks are refused. No Google login is required.

## Procedure and supported commands

1. Inspect the destination read-only and preserve any existing files. Confirm names/preferences; identifiers are configuration, not evidence that resources exist.
2. From the UnCRUD root, preview the exact file inventory:

```bash
node scripts/init-app.mjs --name=my-app --dest=/absolute/parent/my-app --dry-run
```

3. Add `--region=REGION`, `--dev-project=ID`, `--prod-project=ID`, `--auth=anonymous|email-password` only when supplied. Review the dry-run output before generating locally. Run the same command without `--dry-run` to copy source modules, starter, skills, docs and lockfiles. The script excludes Git history, credentials, caches, builds and symlinks.
4. Inspect `app.config.json`. It records preferences; it does not configure real resources. Anonymous auth is implemented in the starter. An email/password preference requires implementing its UI/provider through uncrud-firebase-auth before claiming it works.
5. In the new app run `npm ci`, `npm run build`, `./gradlew build`, then `npm run dev`. Exercise two browser identities. Use uncrud-backend-development/client-development to replace the poll domain rather than exposing generic database CRUD.

## Stop and completion

Stop on a nonempty/symlink destination, invalid IDs, shared DEV/PROD project IDs, unsupported stack, missing runtime or failed build. Do not delete a destination to make the script pass. Authentication/provisioning/deployment are separate authorized workflows.

Report generated path, modules, recorded/unresolved preferences, commands actually run and test results. Success means independent builds and no runtime links/imports into a reference repository. `node scripts/test-scaffold.mjs` verifies a synthetic dry run, overwrite refusal and independent Java/TypeScript builds in a temporary directory.

## Official references

Read [template details](references/template.md) for generated config and customization. Recheck current [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces), [Gradle multi-project builds](https://docs.gradle.org/current/userguide/multi_project_builds.html) and [Codex skills](https://learn.chatgpt.com/docs/build-skills) when changing the template. Reference review: 2026-11-02; verify versions/options at use time.
