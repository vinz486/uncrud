# ADR 0002: local packages and explicit cloud operations

Status: accepted, 2026-11-02.

Use Java 25, Gradle 9.8.2 and Spring Boot 4.1.2; React 19.3, TypeScript 5.9, Vite 8.3, Firebase Web 13.1 and Node 24. These are compatible with the observed source and available tooling. Gradle wrapper checksum and npm lockfile make dependencies reproducible. No proprietary build plugin is needed.

Java core has no runtime dependencies. Firestore and Spring are adapters. React is a headless binding, while Firebase integration is a client subpath. Maven group `local.uncrud` and npm `@uncrud/*` names are local conventions, not claims of namespace ownership. All npm packages remain private.

The supported local profile uses demo-uncrud, Standard-compatible emulator operations and loopback only. For future cloud setup use Firestore Standard Native, separate DEV/PROD projects and an explicitly chosen location. Do not infer a region or create a database silently.

Deploy the SPA to Firebase Hosting and the backend container to Cloud Run. A Hosting rewrite forwards commands to a publicly reachable backend with application Firebase-ID-token verification. This preserves the browser token and avoids introducing a separate IAM token flow. Public reachability requires application authorization and abuse/cost controls; it is not an IAM-private service.

No cloud resources, credential logins, namespaces or releases are created by this extraction. Apache-2.0 and bilingual README were chosen explicitly by the owner. Generic implementation replaces unlicensed reference code.
