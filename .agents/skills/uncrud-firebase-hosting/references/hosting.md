# Routing and release checklist

The root firebase.json is for local emulators and Firestore test configuration; it intentionally has no Hosting deploy target. The example under deploy/firebase has a relative build directory for that file's location. The renderer writes `.local/hosting.json` with an adjusted path; do not move a config without fixing its public-directory base.

Keep `/api/**` first. Its Run rewrite preserves the request path expected by `/api/v1` controllers. The SPA fallback is last. Hosting does not authorize API requests and CORS does not protect a public Run URL. Backend Firebase token validation and domain permissions always apply.

For multi-site: collect the actual site ID, then set `hosting.site` or an explicitly configured target. `firebase hosting:sites:list --project="$PROJECT_ID"` is read-only. Creating a site or running `firebase target:apply` changes resources/local config and belongs to the authorized plan. Do not guess a `.web.app` hostname as owned.

Preview default proposal is one day. Confirm current `hosting:channel:deploy --help` before use. A preview frontend can still hit a shared DEV backend and auth project; an isolated URL is not isolated data. Check allowed origins/authorized Auth domains. `pinTag` couples the Hosting version to a backend revision and may incur tag/revision lifecycle limits; document which revision receives traffic.

Rollbacks: use the Firebase console release history for the exact site or a reviewed `firebase hosting:clone SOURCE_SITE:SOURCE_CHANNEL TARGET_SITE:TARGET_CHANNEL --project="$PROJECT_ID"` command with a verified source version/channel. Promotion and rollback both publish and require approval. Firestore Rules/indexes and backend data are not rolled back by a Hosting release.

Custom domains: verify domain ownership, approved DNS values and TLS readiness through the official console flow; never overwrite unrelated DNS records. Check www/apex behavior, canonical redirects and Auth domains. Do not assume this repository owns a domain.
