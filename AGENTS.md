# UnCRUD

Independent open-source Java/TypeScript project. Work only in this repository or explicitly authorized temporary directories. Reference repositories are read-only: never pull, build, run scripts, change configuration, or operate their cloud resources.

Read `README.md`, then the relevant guide in `docs/`. Keep contracts, producers, consumers, Rules, indexes and tests aligned. Core Java has no Spring/Firebase dependencies; UI packages are headless. Commands carry intention and verified permissions; Firestore projections are the client state. Never expose private documents or accept a caller-supplied identity as authorization.

Use repo-local skills in `.agents/skills/`:

- `uncrud-init-app`: create an independent local app.
- `uncrud-backend-development`, `uncrud-client-development`: implement application behavior.
- `uncrud-local-testing`: build, emulator, Rules and browser checks.
- `uncrud-google-auth`: developer/agent credentials and diagnostic commands.
- `uncrud-gcp-setup`, `uncrud-cloud-run`, `uncrud-firebase-hosting`, `uncrud-firestore`, `uncrud-firebase-auth`, `uncrud-ci-cd`: guided infrastructure and operations.

For other agents, read the selected SKILL.md explicitly if automatic discovery is unavailable; do not assume Codex discovery paths apply to every tool. See `docs/agent-auth.md`.

Local default: Java 25, Node 24 (`nvm use`), `demo-uncrud`, loopback emulator endpoints. Run `npm ci`, `npm run dev`; stop with Ctrl+C. Run `npm run verify` before handing over cross-cutting changes. Tests may not attach to pre-existing emulator processes. Shut down only processes owned by your run.

Never run cloud provisioning, API enabling, IAM/billing changes, deployment, publication, commit or push without explicit authorization. Before cloud writes show exact project, environment, region, resources, costs and rollback. Diagnostics may inspect configured identity through supported CLIs; never print access tokens, inspect credential files, request passwords/keys in chat, bypass interactive login, or grant Owner/Editor for convenience. Application Firebase Auth is separate from developer CLI/ADC credentials.
