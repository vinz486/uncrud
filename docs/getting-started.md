# Local development

## Prerequisites and first run

Use a Linux/macOS shell, or WSL2 on Windows: the runner owns POSIX process groups. Install JDK 25, Node 24.14+ in the 24.x line, and npm. On Linux, Playwright may need system browser libraries: `npx playwright install --with-deps chromium` installs these and can require an administrator. Docker and Google CLIs are not required for the local demo.

```bash
nvm use
npm ci
npx playwright install chromium
npm run dev
```

Open http://127.0.0.1:5174. The runner builds Java and the workspace packages, starts project-managed Auth/Firestore emulators, starts the backend and seeds the local poll, then starts Vite. TypeScript library watchers and Vite pick up frontend changes; restart `dev` after Java changes. Firebase emulators require no login with [a demo project](https://firebase.google.com/docs/emulator-suite/connect_auth).

Use a private browser window for the second identity. Both screens receive the same results. The selected option comes from each user's personal projection. Reloading preserves the anonymous identity through the SDK; separate contexts receive separate UIDs. Closing an emulator run discards its synthetic data. Clear site data when starting a new run if your browser retains an identity absent from the new Auth emulator.

## Checks

Stop `dev` first: tests create their own emulator processes and refuse occupied ports.

| Command | What it does |
| --- | --- |
| `./gradlew build` | Compile/package Java, unit tests and core dependency check |
| `npm run build` | Compile both TypeScript packages and build the SPA |
| `npm run test:unit` | TypeScript client/hook tests and Java unit tests |
| `npm run test:integration` | Owned emulators, Rules tests and Java persistence/API integration tests |
| `npm run test:e2e` | Build, owned emulators/backend/frontend and two-client Chromium test |
| `npm run skills:check` | Skills/frontmatter/local links/configuration/secret-contamination checks |
| `npm run verify` | All of the above, plus independent generated-app build and skill scenarios |

Rules tests deliberately issue rejected requests. `PERMISSION_DENIED` messages are expected when their assertions pass. Unit tests do not require cloud credentials. Emulator authentication verifies SDK behavior with unsigned emulator tokens; this does not claim a live production cryptographic-verification test. Production configuration rejects emulator variables.

Reports: Java `*/build/reports/tests/`, Playwright `playwright-report/`, traces `test-results/`. Runner logs and desktop/mobile screenshots live under `.local/`, which is ignored. A failed component prints the log path; read that log before retrying.

## Local maintenance

While `dev` is running, inspect versions and diagnose views from another shell:

```bash
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 \
./gradlew :starter:backend:reconcile --args='--project=demo-uncrud'
```

Add `--apply` inside the quoted arguments to repair missing/stale views. The supplied operator CLI is local only. It has no public maintenance endpoint. Reconciliation uses private state and never repeats votes. An `AHEAD` result means stop and inspect source/schema versions; applying does not downgrade it.

## Troubleshooting

- **Node version rejected:** select `.nvmrc`; the system shell may still default to Node 22.
- **Port occupied:** inspect the reported owner; stop your own prior run normally. Do not kill arbitrary processes. Required ports are listed in the README.
- **Emulator binary download fails:** retry when the dependency download endpoint is available. Do not replace emulator endpoints with a real project.
- **Invalid local configuration:** both emulator hosts must be present, use `127.0.0.1`, and the project must be `demo-uncrud`. The runner supplies these to its children without changing global configuration.
- **Cached/waiting screen:** check Auth and Firestore logs, network status and site data. Cached counts do not confirm a command. Resolve the connection before sending a new command.
- **`409 VOTE_VERSION_CONFLICT`:** observe the latest personal view and submit a new intention with a new key. Do not change an uncertain command's body while reusing its key.
- **Unknown command outcome:** retry the same body and key; never assume abort means rollback.
- **Native access warnings on Java 25:** current gRPC dependencies may emit JVM warnings; distinguish these from failed assertions or nonzero exit codes.

Ctrl+C shuts down only child process groups owned by the runner. A startup/test failure also cleans them up. The runner does not modify or run any reference repository.
