# Isolated Android validation backend

Supporting A-08R evidence, October 19. The user selected the existing organization for a separate Android test backend. The provider quoted $0 monthly for the additional project under the current plan, and the new project was created in US East (Ohio). This is a current provisioning quote, not a promise about future usage or plan changes. The held legacy backend/deployment was not changed.

## Database baseline and compatibility

The new hosted engine reports PostgreSQL **17.11**. Initial inspection found no application objects, Auth users/identities/sessions, Storage objects, buckets, custom Storage policies or app signup trigger. Its pgcrypto extension is platform-owned in `extensions`, version 1.3; application UUID defaults resolve through the PostgreSQL core function.

The existing exporter gained an optional isolated PostgreSQL 17 engine. The test helper accepts an explicit engine dependency while retaining its default app dependency. PGlite 0.4.6 embeds PostgreSQL 17.5 and is used only in a locked private compatibility workspace. No app dependency downgrade occurred. The [package research](isolated-test-bootstrap-2026-10-19.md) records exact integrity, license, runtime and patch-version limits.

Two empty PostgreSQL 17 restores matched a separate reference compiled from the same 22 migration files on that engine. Each passed 14 synthetic security probes and retained zero rows across the 35 app tables, Auth users and Storage objects. PostgreSQL 17 represents 244 catalog constraints here, versus 512 in the earlier PostgreSQL 18 proof; no comparison hides that difference. The exact schema-only candidate SQL remains unchanged:

```text
ea54f91f4a7cd85f45cdf7e63e5c5ce67f5580dee85b3e7b96879cce1e392008
```

The new project's default public grants were broader than the reference. The [platform guard](../../supabase/bootstrap/isolated-validation-platform-guard.sql) checks the fresh target and removes only `postgres` public-schema defaults for `anon`, `authenticated` and `service_role`, before the schema dump restores explicit grants. Managed schema permissions/owners/defaults remain untouched. A local negative control proved that unnormalized defaults are detected; another control proved that the guard rejects an existing app catalog. A normalized PostgreSQL 17 restore then passed its catalog and security checks.

The combined guard and schema artifact was applied once as `isolated_android_validation_baseline`, recorded remotely as migration `20261019142324`. Earlier business-data migrations were not replayed or falsely stamped applied. Future migration execution must explicitly account for this baseline; never run the old seeded history automatically on this project. Combined artifact SHA-256:

```text
a45697a13c5cebbfa497e671a2825fb589952f77251b343cb52fc4c193b3f8fc
```

## Hosted verification

| Comparison to compiled PostgreSQL 17 reference | Result |
| --- | --- |
| Application tables/views and their ACL/RLS flags | 40 matched |
| Columns/defaults/nullability | 438 matched |
| Enum labels / app functions with definitions and ACLs | 4 / 23 matched |
| Constraints / indexes | 244 / 159 matched |
| App policies, including Storage policies | 58 matched |
| App triggers / views | 10 / 5 matched |
| Unexpected public defaults for app creator and API roles | Zero |

The platform's seven managed Storage triggers were retained and excluded from the app-trigger comparison. The existing managed `public` schema has an extra explicit `postgres` usage grant; the database owner already holds the corresponding authority. The private schema ACL matches exactly. All other application relation/function ACL comparisons matched. These are narrow documented platform differences, not a blanket permission-comparison exemption.

The [rollback-only role script](../../supabase/bootstrap/verify-isolated-validation-roles.sql) passed **32 hosted checks** after first passing locally. It checks all six intended authenticated definer APIs against anonymous and inactive callers, four Operator-only APIs against an active Tech, server-only notification-worker privileges, private-table isolation, server-only evidence attestation and Operator/Tech snapshot boundaries. It uses generated synthetic identities without passwords or mail delivery and rolls all fixtures back.

A separate post-rollback query confirmed zero rows in **39 tables**: the 35 application tables plus Auth users, identities, sessions and Storage objects. One empty private evidence bucket is retained as approved configuration, with the expected image MIME types and 15 MiB limit. No operational records, notification recipients, source files or media bytes were copied.

The security advisor reports six authenticated-definer warnings and two informational private-table/no-policy notices. These are reviewed intentional boundaries supported by the 32 checks; they are not reported as an empty advisor result. Signed-in API entry points still enforce their internal role/active-account rules, and client roles have no direct DML access to the two private tables. [Definer notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [private-table notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

Four bounded HTTPS checks also passed: the new backend accepts its own public key, anonymous profile access returns `401`/`42501`, and each backend rejects the other project's public key. This establishes public-key routing separation only. It does not establish JWT session rejection, old-command ownership rejection or device-journal isolation.

## Application and remaining acceptance

A separate Vercel app project was created on the existing team with explicit shared-mode configuration for the new backend, CSP enforcement and an initial replay hold. Email provider credentials were not configured. The source repository's old local Vercel binding remains untouched; a separate private deployment binding identifies the new project. At this checkpoint no app build has been deployed.

The connector cannot list environment variables: both project environment-list requests returned `403`, and no authenticated CLI was available. The user said they will add the new backend's server secret to the new Vercel project's Production environment directly. Its presence/value has not been verified; no secret is requested in chat or copied from the old environment.

The old project's latest deployment identity still matches the previously verified held deployment. An active-session hold check remains to be repeated; anonymous access or deployment identity alone does not prove its current replay response. A-08R remains open for actual deployed configuration, fresh authorized test identities, wrong-project sessions/old commands, account/environment journals, no queue adoption and continued legacy hold. A-09 physical Android acceptance, A-10 closeout and operational/warehouse gates remain open.

Validation after the test-helper change: 117 unit/database tests, strict TypeScript and focused lint passed. No physical handheld, real Auth sign-in, hosted immutable-byte upload, device replay, deployment, production cutover or portfolio publication is accepted by this backend report.
