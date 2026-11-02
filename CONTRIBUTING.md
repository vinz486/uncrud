# Contributing

Read [AGENTS.md](AGENTS.md) and the architecture guide. Use Java 25 and Node 24, `npm ci`, then `npm run verify`. Commit only source, dependency locks, useful docs and assets; keep credentials, build output, screenshots of private systems and local emulator data out of Git.

Add a test for behavior that can regress. Keep private/public DTOs distinct; align controllers, handlers, projections, decoders, Rules, indexes and docs in the same change. Run the relevant local checks while iterating and the complete gate for infrastructure or contract changes. Report failed/blocked checks honestly.

New infrastructure or consistency guarantees need a short ADR. Do not add a generic CRUD layer, event store, design-system dependency or cloud service without a demonstrated need. Review dependency licenses and security updates. Use focused commits when authorized; no automated commit, push or deployment is part of local tests.

Submit changes under Apache-2.0 and retain applicable third-party notices. Never copy proprietary reference code or credentials into an issue or pull request. For potential vulnerabilities follow [security reporting](docs/security.md#reporting).
