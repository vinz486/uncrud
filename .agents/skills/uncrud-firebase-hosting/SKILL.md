---
name: uncrud-firebase-hosting
description: Configure and locally validate a React SPA on Firebase Hosting, then guide explicitly approved preview/live deploys, Cloud Run rewrites, domains and release rollback.
---

# Firebase Hosting SPA

Use for SPA Hosting config, previews, deploy or rollback. Do not move React onto Cloud Run by default. Read [routing/release details](references/hosting.md) before deploying.

## Inputs and prerequisites

Collect project/environment, Hosting site/target, exact frontend public Firebase config/database, backend service/region, preview versus live destination, approved channel expiry and domains. Confirm Auth and backend projects match. Need Node 24, Firebase CLI, working frontend build and authorized Hosting access. Unknown site IDs/domains stay unresolved; do not invent ownership.

## Procedure and supported commands

1. Build with `npm run build`; for cloud supply reviewed VITE values in the frontend build environment. Local `npm run dev` uses emulators, not this production build. Check build output `starter/frontend/dist` and absence of server secrets.
2. Inspect `deploy/firebase/hosting.example.json`. `/api/**` must precede SPA `**`; the backend must be publicly invocable under the selected strategy but validate user Firebase ID tokens itself. Hashed assets get long immutable caching; index gets no-cache; API gets no-store.
3. Render a local plan/config with explicit inputs:

```bash
node scripts/prepare-hosting.mjs --project="$PROJECT_ID" --region="$REGION" --service="$SERVICE" --dry-run
node scripts/prepare-hosting.mjs --project="$PROJECT_ID" --region="$REGION" --service="$SERVICE"
```

The latter only writes `.local/hosting.json`; it does not deploy. Select/encode an approved site in that config for multi-site projects. Never use the emulator-only root firebase.json for an unintended rules/index deployment.
4. Show exact site/project/channel, rewrite service/revision, cost/expiry and release/rollback plan. Obtain explicit approval before preview/live deploy or domain changes. A preview can reach a live backend; prefer DEV and inspect pinTag behavior.
5. Approved preview: `firebase hosting:channel:deploy "$CHANNEL" --expires=1d --project="$PROJECT_ID" --config=.local/hosting.json`. Approved live: `firebase deploy --only hosting --project="$PROJECT_ID" --config=.local/hosting.json`.
6. Verify deep-link SPA routing, assets/cache headers, Auth authorized domain, `/api/v1/health`, protected command rejection, sign-in and realtime permission boundaries. Test the exact preview origin/domain if CORS is used.

## Stops and output

Stop on placeholder config, wrong project/site, unknown custom-domain ownership, unapproved live target, missing Run invocation access, mismatched Auth project or unexpected backend routing. Do not fix a rewrite failure by bypassing server authentication. Domains require separately authorized DNS changes and certificate verification.

Dry-run path is local config/build plus optional local Hosting emulator validation; no deploy command is a dry run. Report URL only after a successful deployment, channel expiry, exact backend target and checks. Rollback via Hosting release history or an approved known-version clone must account for pinned Run revisions.

## Official references

[Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart), [configuration](https://firebase.google.com/docs/hosting/full-config), [Run rewrites and pinTag](https://firebase.google.com/docs/hosting/cloud-run), [preview/live channels](https://firebase.google.com/docs/hosting/test-preview-deploy), [custom domains](https://firebase.google.com/docs/hosting/custom-domain).

Reviewed 2026-11-02; verify current CLI flags, channel limits and supported rewrite regions.
