# Isolated validation bootstrap: local proof

This is supporting evidence for A-08R, not a second plan. On October 19, a schema-only candidate compiled from the current 22 migrations restored into two independently empty local PostgreSQL instances. Both matched the compiled application catalog and passed the same 14 security probes. No hosted project was created or modified. A-08R remains open.

## Why a separate bootstrap is needed

Historical migrations contain business inserts and demo-data replacements. Replaying those files directly into the proposed Android test backend would carry old records and prerequisites into what should be a fresh environment. The existing database-test helper is used only to compile a disposable local reference. Its simplified Auth/Storage objects are not exported as hosted platform definitions.

The exporter uses the official schema-only dump API, preserving application grants and revokes. It separately exports the current app signup trigger, eight Storage policies and the narrowly defined private evidence-bucket configuration. Function bodies retain their required runtime behavior; this is not a keyword filter that deletes every SQL `INSERT`. The [research report](isolated-test-bootstrap-2026-10-19.md) records the current primary sources, migration hazards and package qualification.

## Reproduction

Use the repository's supported Node 24.22.0 or later supported 24.x runtime. In a separate, disposable tools workspace, install exact versions without lifecycle scripts:

```text
npm install --save-exact --ignore-scripts --no-fund --no-audit @electric-sql/pglite-tools@0.4.8 @electric-sql/pglite@0.5.8
```

From the application repository, with a new evidence directory outside it:

```text
node scripts/check-node-runtime.mjs
node scripts/prepare-isolated-validation.mjs <isolated-tools-workspace> <new-output-directory>
```

The script checks the exact package pair and recorded tools-lock integrity. The research independently checked the downloaded tools tarball against registry SHA-512. Package integrity establishes byte consistency, not a security clearance. The app's package manifest and lockfile are unchanged; no export tool is added to browser/runtime dependencies.

The bounded subprocess has a 90-second limit. Output is local: candidate SQL, reference/restored catalogs, migration/tool/script identities and results. It has no hosted connection or apply mode, refuses an existing output directory and never edits a migration or source document. Run from the reviewed source tree; the manifest records the parent commit plus current script/helper and every migration hash.

## Results

| Check | Result |
| --- | --- |
| Independently empty restores | 2 passed |
| Application schemas | 2 |
| Tables and views | 35 tables, 5 views |
| Columns / enum labels / app functions | 438 / 4 / 23 |
| Catalog constraints / indexes | 512 / 159 |
| Policies / noninternal app triggers | 58 / 10 |
| Managed-schema additions | 1 Auth trigger, 8 Storage policies |
| Allowed configuration | 1 private bucket; no object rows |
| Empty-state checks per restore | 35 app tables, Auth users, Storage objects: all zero |
| Security probes per restore | 14 passed; temporary fixtures rolled back |
| Unexpected target default-ACL control | Difference detected as required |
| Focused script lint | Passed |

Security probes cover inactive profile creation by the signup trigger; denied anonymous table access; active Operator and assigned Tech access; unassigned/inactive Tech isolation; inactive snapshot rejection; denied client evidence attestation; and notification-worker privileges restricted to the server role. All probe identities use synthetic `.invalid` addresses, and a transaction rollback returns the databases to their verified empty state.

The negative control deliberately gives a third disposable target broader anonymous table defaults. Restoring the candidate does not revoke those inherited grants automatically; the catalog comparison detects the mismatch. This proves the need to inspect and normalize the real target's defaults before object creation. It is not a finding that the current hosted environment has those defaults or that RLS was bypassed.

The dump session leaves `row_security=off` and other restore settings active. The candidate ends with `RESET ALL`, and the proof explicitly checks that row security is on before role tests. The tools wrapper also cannot restore an empty `search_path`; the harness supplies `public` before export and uses an empty path only for canonical catalog comparison.

Final candidate SHA-256:

```text
ea54f91f4a7cd85f45cdf7e63e5c5ce67f5580dee85b3e7b96879cce1e392008
```

Both restored catalog SHA-256 values:

```text
f336e511b90cb309c7d8b9222c7c16bf7253abf2a77dec6e4ddd888f60af4862
```

## Hosted work still required

The actual local engine identifies itself as **PostgreSQL 18.3**, despite the app using the named PGlite 0.5.8 package. The existing hosted project is PostgreSQL 17; the version of a new target must be read after provisioning. PostgreSQL does not guarantee that a newer `pg_dump` output will restore into an older major version. The 512-constraint count includes the local engine's catalog representation and is not a promised hosted PostgreSQL 17 count. Review syntax/catalog differences and prove the chosen target before applying this candidate. [PostgreSQL dump compatibility](https://www.postgresql.org/docs/18/app-pgdump.html)

Local success also does not establish managed Auth tables, Storage APIs, real sessions, Data API exposure, extension namespaces, object ownership or target default privileges. The schema-filtered dump does not include pgcrypto's extension objects; current app definitions use core `gen_random_uuid()`. Actual target extension and function resolution still require inspection. Never install the helper's fake platform tables or broad test grants remotely.

Provisioning awaits the required organization choice and actual project-cost/capacity check. Before remote writes, bind tooling to the approved new project, assert the target is empty, review platform defaults/ownership and apply only a target-compatible reviewed baseline. Record how future migrations follow that baseline; do not mark seeded historical migrations applied without an explicit reconciliation. Then repeat hosted role/evidence tests and establish fresh synthetic identities and fixtures.

The distinct application origin, explicit shared-mode backend configuration, wrong-project and old-command rejection, account/environment-scoped journals, absence of queue adoption and continued legacy replay hold still need deployed evidence. Physical Android and exactly-once acceptance remain separate. No stock import, hold release, hardware order, deployment or portfolio publication occurred.
