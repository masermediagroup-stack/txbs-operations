# Empty Supabase validation-project bootstrap research

Research date: 2026-10-19. Supporting A-08R isolation and acceptance preparation. Repository inspected at commit `fc624f1a16380ae572ab108d51127c8bbbf546cf`; 22 migration files were present. This report changes no database, project, application, migration or dependency. It contains technical source references and no seed identities or operational data.

Subsequent implementation evidence is recorded separately in the [local bootstrap proof](isolated-bootstrap-local-proof-2026-10-19.md). That harness executed the export and local restores after this research; it does not establish hosted acceptance.

## Recommendation and demonstrated limits

Prepare a **reviewed, reproducible application-schema bootstrap**, excluding legacy business/Auth rows, and prove it locally before applying it to a separately approved empty hosted project. Preserve platform-owned Supabase Auth/Storage catalog objects. Following package qualification below, the preferred Docker-free candidate is **compile the current history locally, export with pinned official PGlite `pgDump`, and add narrowly scoped managed-schema/configuration overlays**. A manually selected DDL history remains a fallback, carrying more statement-selection risk. Neither route is currently proved on a hosted target by this research.

The existing [`tests/helpers/database.ts`](../../tests/helpers/database.ts) is not an empty hosted baseline. It creates simplified Auth/Storage tables and roles, then replays every migration, injecting two synthetic prerequisite projects before a historical demo replacement. That is deliberate database-test scaffolding, not a recipe for a new hosted Supabase project. Do not export those stubs over hosted Auth/Storage. Do not copy legacy business records or Auth users to satisfy migration dependencies.

`supabase/config.toml` enables seeding and names `seed.sql`, but that file was absent on inspection. More importantly, several migrations themselves execute business-data writes. `--no-seed` suppresses a separate seed script, not DML embedded in migration SQL. [`Local configuration`](../../supabase/config.toml), [Supabase reset reference](https://supabase.com/docs/reference/cli/supabase-db-reset)

## Available routes

### 1. Official schema-only dump, plus reviewed platform customizations

Supabase documents `db dump` as schema-only by default, without custom roles, and says it runs `pg_dump` in a container while excluding managed Auth/Storage/extension schemas. The installed CLI wrapper successfully displayed `db dump --help`, including `--schema`, `--db-url`, `--dry-run` and `--file`. No `docker`, native `pg_dump` or `psql` command was found on PATH; no dump was executed. A portable native client or an approved container-capable environment would change that tooling constraint. [CLI dump reference](https://supabase.com/docs/reference/cli/supabase-db-dump)

Export only application-owned schema from a reviewed source, with no data, Auth rows, custom role passwords, subscriptions or operational settings. Preserve explicit grants/revokes: `--no-privileges` alone is not suitable when validating this application's security contracts unless all ACLs are restored from a reviewed companion manifest. Schema selection is not automatically dependency-complete. [PostgreSQL pg_dump options](https://www.postgresql.org/docs/17/app-pgdump.html)

A `public`/`private` export is insufficient by itself: the app's signup trigger lives on `auth.users`; evidence policies live on `storage.objects`; and its private bucket is configuration data rather than table DDL. Supabase explicitly requires separate restoration of application customizations to managed schemas. Recreate only those exact app-owned triggers/policies/configuration on the target's existing platform objects. Do not restore managed schema definitions or any storage object rows/bytes. [Supabase restoration guidance](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

### 2. PGlite schema-only SQL export

The official `@electric-sql/pglite-tools/pg_dump` API accepts a **PGlite instance**, arguments and an optional filename, returning a `File`. It is a WASM `pg_dump`; it does not accept a hosted Supabase URL as its database argument. The package was absent from the app and was not installed by this research. An exact compatible tarball was subsequently inspected in a separate private research workspace. A candidate invocation is:

```js
const dump = await pgDump({
  pg: reviewedLocalDatabase,
  args: ['--schema-only', '--schema=public', '--schema=private', '--no-owner'],
});
const sql = await dump.text();
```

This invocation is source-derived, not executed here. Pin a compatible version and verify exact output before adopting it; retain application ACLs and the same managed-schema overlay described above. The tool appends some options and deallocates prepared statements, so test it in a disposable instance. [Official PGlite tools documentation](https://pglite.dev/docs/pglite-tools)

Compile the reviewed current migration semantics in an isolated local database, then export only object definitions. Do not assume a helper's platform stubs or broad fixture grants reproduce hosted security. An exporter must reject accidental data sections and compare resulting catalog contracts. Local PGlite verifies SQL/constraints and role behavior, not hosted GoTrue sessions, PostgREST exposure, Storage API ownership, external workers or mobile replay.

PGlite's `dumpDataDir()` is a physical data-directory archive intended to be imported back into PGlite. It retains data and is not a schema-only SQL baseline or supported hosted restore route. [PGlite API](https://pglite.dev/docs/api#dumpdatadir)

#### Exact package qualification and Node usage

Fresh registry metadata on October 19 identified latest tools version **0.4.10**, which requires the exact peer PGlite **0.5.10**. Version 0.4.9 requires 0.5.9. **Tools 0.4.8 requires the app's existing PGlite 0.5.8**, so qualify that pair in an isolated workspace without changing the app. The 0.4.8 registry metadata and inspected tarball both declare Apache-2.0; an Apache LICENSE file is included. Retain package and underlying PostgreSQL notices. [Exact 0.4.8 registry metadata](https://registry.npmjs.org/@electric-sql%2fpglite-tools/0.4.8), [latest metadata](https://registry.npmjs.org/@electric-sql%2fpglite-tools/latest), [official package source](https://github.com/electric-sql/pglite/blob/main/packages/pglite-tools/package.json)

The downloaded 0.4.8 tarball's independently computed SHA-512 matched registry SRI:

```text
sha512-WjgS8US6xfuE0wLYn5m9WrZ/+8dQWoQuQSRkpe7eYcxxx1UjZjvq30rpYSHfGrGtTke/zNiCd9ijVGeRUD8ukg==
```

Its registry SHA-1 is `1f38806608451313273991f1209a15d786f11565`. This proves byte consistency with the retrieved registry metadata, not an advisory clearance or independently reproduced build. The archive was inspected without installing/executing it. `tar.exe` existed but execution was denied, so a bounded Node gzip/tar reader inspected package metadata/types/LICENSE instead. No application dependency file changed.

The package exports Node ESM and CommonJS subpaths. Its declaration returns `Promise<File>` and lists `pg`, `args`, `fileName`, `database` and `verbose`; however, the inspected implementation consumes **only `pg`, `args`, `fileName`**. Do not rely on the other two typed fields. It appends `--inserts -j 1 -f /tmp/out.sql -U postgres`, restores the prior search path, deallocates statements, fails on a nonzero dump exit code and strips psql `\\restrict`/`\\unrestrict` metacommands. [Official implementation](https://github.com/electric-sql/pglite/blob/main/packages/pglite-tools/src/pg_dump.ts)

```js
import { pgDump } from '@electric-sql/pglite-tools/pg_dump';
const output = await pgDump({
  pg: compiledLocalModel,
  args: [
    '--schema-only', '--schema=public', '--schema=private',
    '--no-owner', '--no-comments',
  ],
  fileName: 'validation-application-schema.sql',
});
const schemaSQL = await output.text();
```

Run this only against a disposable compiled model with the matching runtime. `--schema-only` suppresses table data despite the wrapper's appended `--inserts`; **omit `--no-acl`/`--no-privileges`** so grants/revokes survive. Expect selected schema/object definitions, not an already hosted-compatible artifact. Inspect actual `CREATE SCHEMA`/`CREATE EXTENSION` output: `public` already exists on hosted targets, `private` may not, and extension inclusion depends on schema/extension selection. Do not strip all extension/schema/ACL statements blindly. Verify extension schema/version, target default ACLs and platform-owned schema ownership explicitly before restore. [PostgreSQL dump semantics](https://www.postgresql.org/docs/17/app-pgdump.html)

#### Required overlays from the compiled local catalog

Export the **current resulting definitions**, not an early historical policy set:

- `auth.users`: exactly the app-owned, noninternal `on_auth_user_created` trigger, using `pg_get_triggerdef(oid, false)` plus its enabled state. Its `private.handle_new_auth_user()` function belongs in the application-schema dump. Do not export other platform Auth triggers or the local fake Auth table.
- `storage.objects`: exactly eight application policies: `operational_media_select`, `operational_media_insert`, `operational_media_update`, `operational_media_delete`, `operational_media_tech_insert`, `operational_media_tech_own_select`, `operational_evidence_immutable_update`, `operational_evidence_immutable_delete`. Capture roles, command, permissive/restrictive flag, `USING`, `WITH CHECK`; render correctly quoted policy DDL from those catalog fields. Verify names/count/content against the manifest and preserve the two restrictive immutability policies.
- The `operational-media` bucket: read only configuration fields `id`, `name`, `public`, `file_size_limit`, `allowed_mime_types`, validate against the approved constant configuration and generate the narrow configuration overlay or use the supported Storage bucket API. No other bucket rows, owners, object metadata or bytes are included.

The eight-policy set is grounded in the foundation, field-work and stabilization migrations. Use `pg_policies` or `pg_policy` plus `pg_get_expr` to serialize expressions; there is no complete generic `pg_get_policydef` assumed here. Treat missing/extra policies, unexpected roles or changed expressions as a review failure. Verify table RLS on the existing target platform table; never recreate the fake Storage tables or copy the helper's broad fixture grants. [Catalog deparsers](https://www.postgresql.org/docs/17/functions-info.html), [bucket creation API](https://supabase.com/docs/guides/storage/buckets/creating-buckets)

The preferred proof compiles history only in the local source model (where historical demo rows may exist), exports schema plus these overlays, and restores to a **different** empty local platform scaffold. Compare final schema/security fingerprints and prove all application/Auth rows and Storage objects in the restored model are zero. This validates a candidate artifact locally; the simplified scaffold does not establish hosted Auth/Storage/ACL equivalence or authorize a remote restore.

### 3. Management API and catalog inspection

The Management API exposes a read-only SQL endpoint and an experimental database-context metadata endpoint. These can support schema-qualified catalog inspection and target verification without local PostgreSQL tools. The inspected documentation did **not** establish a complete, portable SQL schema-dump endpoint. A list of schemas, generated TypeScript types or PostgREST OpenAPI does not reproduce constraints, RLS, definer functions, triggers, grants and default privileges. [Read-only query API](https://supabase.com/docs/reference/api/v1-read-only-query), [database metadata API](https://supabase.com/docs/reference/api/v1-get-database-metadata)

The write-query endpoint can execute reviewed target SQL, but it is a distinct write operation and not evidence that the SQL is an adequate baseline. Its current reference labels it experimental/Beta. If selected later, bind the request to the approved new project identity, capture artifact hashes and fail on any unexpected existing object; do not point a generic script at whichever project happens to be linked. [Management SQL query API](https://supabase.com/docs/reference/api/v1-run-a-query)

## Actual migration statements requiring disposition

Line numbers identify the inspected source, not a permanent text-slicing implementation. Any implementation must validate exact source hashes and SQL statement boundaries, with an explicit decision for every statement. Do not split SQL on semicolons or delete every line containing INSERT/UPDATE: functions legitimately contain DML inside dollar-quoted bodies.

| Migration | Required treatment for an empty baseline |
| --- | --- |
| `20260810192506_phase_06_shared_inventory_foundation.sql` | Retain extension/private schema/types/tables/constraints/functions/RLS/grants and the signup trigger. Lines 832–843 create/update the private evidence bucket: treat as an explicit configuration exception, or recreate that exact bucket through the supported Storage API. Exclude business Site/location inserts starting line 876. Retain policies between bucket configuration and business inserts. |
| `20260817140557_add_conex_8_fw_maudrie_marker_boards.sql` | Exclude the entire data-correction `DO` block. It depends on an existing named Site, writes location/inventory/activity data, and raises if the prerequisite is absent. It is not schema bootstrap. |
| `20260817193000_operator_tech_account_model.sql` | Retain enum addition at line 3 and function/security definitions from line 26. Exclude top-level profile conversion, membership population and membership cleanup at lines 5–24. Empty targets need none of those data conversions. |
| `20260818120000_richardson_site_and_tech_visibility.sql` | Exclude business/demo inserts and membership population before line 161. Retain the access-function definition and grants from line 161 in their historical order, followed by subsequent access hardening. |
| `20260818140000_replace_richardson_test_project_inventory.sql` | Exclude the entire demo replacement, including temporary disabling/re-enabling of the append-only audit trigger, deletes, allocations and activity inserts. Do not copy its helper prerequisites into the target. |
| `20260831120000_receiving_email_notifications.sql` | Retain tables, indexes, RLS, queue trigger and functions. Exclude the final hardcoded notification-recipient insert starting line 286. No legacy recipient, dispatch job or delivery history belongs in the empty baseline. |
| `20260901100000_fix_receiving_document_photo_column.sql` | Retain this schema-changing `DO` block when replaying the reviewed history. It reads and rewrites a function body and asserts that the expected stale column reference exists; it is not seed data and is not safely rerunnable. A final compiled-schema dump should already contain the corrected function and must not replay the patch again. |
| `20260903120000_project_stage_workflow.sql` | Retain the private function rename/core-wrapper structure and revokes in dependency order. The rename makes raw replay non-idempotent. |
| `20260908140558_stabilization_access_and_evidence.sql` | Retain restrictive active-account policies, immutable Storage update/delete restrictions, verified-upload structures/functions and the staged-upload privilege removal. Do not stop at the earlier permissive evidence policy set. |
| `20260909143245_audited_evidence_retention.sql`, `20260909144424_installation_quantity_integrity.sql`, `20260916110000_restrict_notification_dispatch_rpc.sql` | Retain final private retention/security contracts, installation quantity-integrity function and server-only dispatch grants. Retention rows and notification delivery rows remain empty. |

Source files: [`supabase/migrations`](../../supabase/migrations). Other migrations still require full statement review; this table identifies observed hazards rather than declaring an unimplemented exporter complete.

Do not drop all `DO` blocks: the foundation uses one to create the enum, a later data-only block must be excluded, and the photo-column repair uses one for required DDL. Preserve enum commit boundaries: PostgreSQL forbids using a newly added enum value until the transaction adding it commits. A monolithic transaction formed by concatenating historical files can therefore behave differently from ordered migration execution. [PostgreSQL ALTER TYPE](https://www.postgresql.org/docs/17/sql-altertype.html)

The test helper's synthetic `anon`, `authenticated`, `service_role`, `auth.users`, `auth.uid()`, `storage.buckets` and `storage.objects` definitions are **local scaffolding only**. A real empty Supabase project already supplies platform roles and managed catalogs. Verify extension availability/schema and PostgreSQL major version against the target; local config requests PostgreSQL 17, which does not prove the hosted version. [`Test helper`](../../tests/helpers/database.ts), [`configuration`](../../supabase/config.toml)

## Proposed reproducibility and acceptance contract

1. Produce a versioned bootstrap artifact plus a manifest of source commit, every migration hash, included/excluded statement identity, configuration exceptions, tool/runtime versions and artifact hash. Preserve historical migrations; do not silently rewrite them into a competing migration history.
2. Reject any unclassified top-level statement and any unexpected source hash. Keep creation-time function bodies intact, including required runtime DML; review executable `DO`, dynamic SQL and configuration inserts separately. Never use a keyword-only seed filter.
3. Apply the artifact twice to two independently empty local test databases, preserving required phase commits, and compare final schema/security fingerprints. Test fresh creation; do not pretend the baseline is generally rerunnable. Record how future migrations start after this baseline instead of allowing an automatic raw-history replay.
4. Compare types/enums, columns/defaults, indexes/constraints, RLS enable/force flags, complete policy expressions and permissive/restrictive modes, function signatures/bodies/volatility/definer/search paths, triggers, object grants and default ACLs. Include auth signup and storage policy overlays. Use catalog deparsers such as `pg_get_functiondef`, `pg_get_triggerdef`, `pg_get_constraintdef`, `pg_get_indexdef` and `pg_get_expr` as verification aids, not a complete ad hoc dump implementation. [PostgreSQL catalog-information functions](https://www.postgresql.org/docs/17/functions-info.html)
5. Against the approved empty hosted project, verify its identity/version/platform prerequisites before any write. Use narrowly scoped administrative access and stop on pre-existing application objects/data. Apply only the reviewed artifact; prove all application tables in both `public` and `private` have zero rows, Auth users/identities/sessions are empty, no Storage objects exist and no legacy recipients/jobs/configuration secrets were copied. Platform-internal catalog rows and an explicitly provisioned empty private bucket are not business stock.
6. Verify grants **and** RLS through anonymous, active Operator, assigned/unassigned Tech and inactive-user behavior. No fresh function may inherit unintended PUBLIC execution. Check server-only dispatch and evidence-retention APIs independently. New target default privileges may differ from the source; schema creation alone is insufficient. [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api)
7. Only after empty-baseline acceptance, provision separately identified synthetic Auth accounts/fixtures through reviewed supported paths, with notification/email integrations disabled or safely isolated. Assert no legacy identity or operational row was introduced. A-08R's existing device-queue/recovery/replay holds remain unchanged until their own evidence passes.

## PostgreSQL 17 engine qualification for an isolated compatibility check

The official release history moves to PostgreSQL 18.3 at PGlite 0.5.0. The current npm registry lists latest 0.5.10 and final pre-0.5 release **0.4.6**; there was no PostgreSQL-17-specific dist-tag in that response. The last explicit PostgreSQL 17 update in the changelog is 17.5. This identifies a candidate older package, not a currently patched PostgreSQL 17 distribution. [Official changelog](https://github.com/electric-sql/pglite/blob/main/packages/pglite/CHANGELOG.md), [registry metadata](https://registry.npmjs.org/@electric-sql%2fpglite), [exact 0.4.6 metadata](https://registry.npmjs.org/@electric-sql%2fpglite/0.4.6)

**Proved locally on October 19:** `@electric-sql/pglite@0.4.6` starts an in-memory database under **Node v24.22.0, Windows x64**. `SELECT version()` reports **PostgreSQL 17.5**, `server_version_num = 170005`, compiled for wasm32 using Emscripten 3.1.74. Loading the same package's `contrib/pgcrypto` and executing `CREATE EXTENSION pgcrypto` succeeds with extension version 1.3. An earlier exploratory run used Node 24.19.0; the 24.22.0 run supersedes it for qualification. No recommendation to use the older Node runtime is made.

The exact tarball's independently calculated SHA-512 matches registry SRI:

```text
sha512-qmlmfN8UyKCee35qkV0r/MBp+Znl8FjBz7OpoglNvww3GJpw0/DLP0o1ZymvLNmcD5DTLOQdzKPtF8Hd3mdl1w==
```

Registry SHA-1 is `9a0b606e6aaf40a6fdbe323b470dde0f415f18b4`. The package declares Apache-2.0 and includes its LICENSE. A separate private npm workspace pins exactly 0.4.6 with `package-lock.json`; installation used `--ignore-scripts --no-audit --no-fund`. Its `engine-evidence.json` records package integrity, runtime and query results. No app dependency, script or migration changed. Node ESM imports work directly from the package and its contrib subpath; the engine is WASM within Node, not a native PostgreSQL server or addon. [Exact package](https://registry.npmjs.org/@electric-sql%2fpglite/0.4.6), [official Node/WASM architecture](https://github.com/electric-sql/pglite)

The documented custom WASM/initdb/filesystem inputs are asset-loading mechanisms, not a confirmed supported selector that makes the current 0.5 runtime a PostgreSQL 17 build. Do not mix a 17 WASM binary, 18 runtime and mismatched extension assets. No supported current-release PG17 selection option was established by the inspected docs. [PGlite API options](https://pglite.dev/docs/api)

Use 0.4.6 only in a disposable compatibility experiment when the **actual target major** is 17: restore the candidate schema into PG17 and compare against independently compiled PG17 migration semantics. The engine smoke above does not prove that restore or comparison. If the actual target is 18, prefer target-major validation rather than adding an unnecessary PG17 compiler dependency. PGlite is single-user/single-connection; it does not reproduce hosted concurrent sessions, Supabase-managed catalogs/services, extension packaging or platform grants. PostgreSQL 17.5 is not the latest PostgreSQL 17 patch, and no current advisory clearance is claimed. This is neither a production downgrade nor a reason to replace the app's current PGlite dependency. [Official limits](https://github.com/electric-sql/pglite#limitations)

## Current evidence versus work remaining

**Observed:** local migration/helper/configuration hazards; installed CLI help; absent native dump/Docker commands on PATH; absent pglite-tools; current primary docs and successful Supabase documentation searches. The changelog index initially failed in the web reader because of its Markdown content type, then fetched successfully through a bounded read-only HTTPS request. The relevant TLS-cipher change concerns project HTTP API compatibility, not a schema-only bootstrap mechanism; scoped Management tokens are now documented. [Changelog](https://supabase.com/changelog.md), [TLS change](https://supabase.com/changelog/cbc-tls-ciphers-deprecated), [scoped tokens](https://supabase.com/changelog/scoped-personal-access-tokens-ga)

**Not proved here:** a selected DDL artifact, a PGlite schema export, complete schema equivalence, actual source/target catalog state, target credentials/access, empty hosted initialization, hosted Auth/Storage behavior, notification isolation or physical mobile replay. No authenticated project query or external mutation was performed. A reviewed artifact and validation evidence must precede any claim that the new validation environment is safe and ready.
