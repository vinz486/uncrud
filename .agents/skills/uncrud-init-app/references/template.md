# Template contract

The app generator uses a file allow/filter pass, refuses source symlinks and excludes `.git`, `.serena`, `.gradle`, `.local`, dependencies, builds, reports, logs and actual `.env*`. It copies `.env.example` only. It adjusts root package/lockfile names together; library imports remain local workspace imports. It does not run install scripts, create a Git commit or call a cloud CLI.

Generated `app.config.json` records name, stack, region, devProjectId, prodProjectId, auth, Hosting strategy and localProjectId. Null cloud fields are intentional. Local profile remains demo-uncrud for safe tests; do not substitute real project IDs into local emulator commands.

For customization: implement domain source records and explicit views; replace seed only in local mode; implement handlers and controllers; update client decoders and paths; rewrite Rules and indexes; replace poll tests with equivalent positive/negative/concurrency tests. Review README language links and source extraction documentation for your app. Keep the framework provenance truthful but remove reference-only extraction files if they are irrelevant to the derived app.

Before cloud work select new project IDs and region with the human and load uncrud-gcp-setup. A chosen ID can be unavailable or forbidden by organization policy; recording it does not reserve it. Never change billing or IAM while generating files.
