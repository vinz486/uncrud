# Local verification record

Executed on 2026-11-02 with Java 25.0.1, Node 24.14.0 and npm 11 (the npm bundled with that Node installation). Results below describe the final local implementation, not a deployed cloud environment.

| Check | Result |
| --- | --- |
| `npm run verify` | Passed: full build, unit tests, independent generated app, skill scenarios, owned emulators, Rules, Java integration, E2E and `git diff --check` |
| Java unit tests | 6 passed: domain vote/retry/conflict/authorization behavior and identity/environment guards |
| Java emulator integration tests | 6 passed: concurrent retry/votes, rollback/rebuild, pagination/ahead guard, stale/orphan repair, real emulator-token API cases, read-only operator startup |
| TypeScript client and React tests | 13 passed: refresh limit, uncertain outcomes, timeout/token/auth races, shared subscriptions, snapshots/errors/cleanup and identity/query isolation |
| Firestore Rules tests | 5 passed: unauthenticated/private denials, shared/owner reads, query bounds, non-owner/admin-claim denial and all client writes denied |
| Chromium E2E | 1 passed: two isolated identities receive realtime vote changes; private/non-owner reads, database writes and unauthenticated API call rejected |
| Independent app generation | Dry run made no files; generation succeeded; overwrite refused; generated app passed `npm ci`, frontend build and Java build; temporary directory removed |
| Skill scenarios | Hosting dry-run rendered explicit targets with no cloud actions; missing/demo target refused; occupied local port rejected without stopping its owner |
| Skill structure | All 11 passed both repo validation and skill-creator `quick_validate.py` |
| Documentation/config | Local links, JSON/YAML, Hosting rewrite order, loopback emulator settings, private package metadata and contamination checks passed |
| Official reference HTTP check | All 56 inventoried official HTTPS links responded successfully after replacing an obsolete budget URL |
| Docker image | `docker build -f deploy/cloud-run/Dockerfile -t uncrud-local .` passed locally |
| Artifact metadata | Three Java library POMs generated locally; npm pack dry-run showed declarations/JS and Apache license for both packages; nothing published |
| Visual checks | Desktop/mobile starter screenshots and all three SVG/PNG diagrams rendered and inspected; no mobile horizontal overflow in E2E |
| Process/source boundaries | Owned app/emulator processes stopped; dedicated ports free; reference repository status remained clean |

31 tests across the test runners passed (6 Java unit + 6 Java integration + 13 TypeScript/React + 5 Rules + 1 browser scenario), in addition to build, generator, structural and operational checks. Some Gradle tasks reused unchanged outputs; emulator integration ran against fresh owned emulators.

Logs/reports are local ignored artifacts: `.local/verify.log`, `.local/*.log`, `*/build/reports/tests/`, `playwright-report/`, `test-results/`. Re-run checks for later changes; this record is a dated result, not a promise about a future checkout.

## Limits of this evidence

No GCP/Firebase project, billing, API, IAM, provider, domain, registry push or deployment was created/modified. No developer login, remote Git operation, npm/Maven publication or commit was performed. The optional cloud workflow remains inert. Cloud flags/templates are documented and structurally checked, not executed against real resources.

Emulator token tests use emulator-supported unsigned tokens; they exercise valid, malformed, expired, wrong-audience and disabled-user behavior but do not prove live production signature/IAM configuration. Rules tests intentionally emit permission-denied messages. Java dependencies may emit native-access warnings; the SPA build reports its Firebase-containing bundle size. Neither was a failing check.

V1 keeps projections atomic and repairs metadata-detectable lag/missing views from private state. It does not supply asynchronous workers, a cloud reconciliation command, tenant membership, sharded counts, automatic receipt retention or production antiabuse controls. See [architecture](architecture.md) and [security](security.md).
