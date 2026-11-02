# Releases and future publication

Current status: local workspace only. Java group `local.uncrud`, version `0.1.0-SNAPSHOT`; npm packages `@uncrud/client` and `@uncrud/react`, version `0.1.0`, all marked private. These are local coordinates, not verified Maven Central/npm namespaces. Java library POM metadata is prepared, with no publication repository; no publication is performed.

Before a release, run `npm ci`, install Chromium if needed, and `npm run verify`. Review Java jars/sources/Javadoc, TypeScript declarations and npm package contents using `npm pack --dry-run -w @uncrud/client` and `npm pack --dry-run -w @uncrud/react`. Check Apache-2.0 files, dependency licenses and notices. Review lockfile changes and reproducibility. No real configuration, credentials or source-application content may enter artifacts.

Choose and verify namespace ownership with the maintainer before configuring [Maven Central publishing](https://central.sonatype.org/publish/publish-guide/) or [npm publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages). Then add complete POM/package metadata, verified SCM coordinates, licensing, signing/provenance and keyless/trusted publishing where supported. Removing `private` or running publish is a separate authorized release action.

Start with coordinated module versions. Use semantic versioning for public contracts; document receipt/error, projection schema and runtime compatibility. A projection schema change needs coordinated builders, decoders, Rules/index changes and a migration/reconciliation plan. Avoid old/new deployments writing incompatible schemas concurrently. A source version is not a library version.

GitHub CI only runs local checks. The inert cloud workflow template requires explicit configuration, WIF restrictions and protected environments before activation; deployment is not package publication. Release notes must list actual tests and cloud verification separately. Never describe an emulator success as a deployed-production verification.
