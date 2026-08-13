# Phase 6 Temporary Supabase and Vercel Validation Plan v1

- Plan version: v1
- Source plan: [Phase 6 v1](v1.md)
- Baseline audited: 2026-08-10
- Status: Temporary environment choices approved; implementation has not started
- Purpose: Validate the real Phase 6 architecture in a disposable shared environment before production cutover
- Downstream consumers: [Phase 7](../phase-07-mobile-yard-companion/v1.md), [Phase 8](../phase-08-qr-labels/v1.md), [Phase 9](../phase-09-yard-map/v1.md), and [Phase 10](../phase-10-reporting-intelligence/v1.md)

## Outcome

Create one clearly marked, non-production TBS Operations environment that uses the intended production architecture:

- A dedicated Supabase project for shared Postgres data, controlled temporary password authentication, private Storage, Row Level Security, and database audit history. Microsoft Entra remains the required later production-authentication step.
- A dedicated Vercel project with one stable HTTPS test URL for desktop, phone, tablet, OAuth callback, camera upload, and cross-device validation.
- The current Next.js application and workflows, extended rather than redesigned.
- Repository-owned SQL migrations and generated database types so the temporary environment validates code that can later be applied to a fresh production project.
- A rehearsed import of the current schema-v5 IndexedDB backup without making the temporary database the source of production truth.

The temporary database and its test records are disposable. The reusable outputs are migrations, policies, command interfaces, tests, import tooling, and evidence. Promotion to production must use a separately approved project and a fresh cutover decision.

## Repository and connected-resource audit

### Application baseline

- The application is a Next.js 16.2.12 App Router modular monolith.
- Inventory has one client-side TanStack Query provider backed by a schema-v5 IndexedDB snapshot and image-blob store.
- `InventoryPersistence` currently loads and commits an entire normalized snapshot. `createInventoryService` owns local transactions and implements Receiving, verification, movement, outbound, and Issue workflows.
- The current service already has UUID command IDs, lot entity versions, append-only Activity history, immutable movement/outbound reversal evidence, and portable photo checksums.
- Receiving requires at least one material photo per receipt line. A Damaged Issue requires damage evidence. Photos remain optional for other actions.
- The repository has no `.git`, `.vercel`, `supabase/`, or tracked environment template. Git, Vercel CLI, and Supabase CLI are not currently available on the ordinary terminal `PATH`.
- The installed Next.js documentation confirms that `proxy.ts` is suitable for optimistic routing/session refresh only. Authorization must also occur close to the data source and inside every mutation.

### Supabase candidate

The connected Supabase organization is currently displayed as `TXBS`. The user approved changing its display name to `TBS` for this testing setup. It contains one active healthy project that is a technically clean candidate for temporary validation:

- Project ref: `iixiigkevuqwewtagtee`
- Region: `us-west-2`
- Postgres: 17
- Application tables: none
- Project migrations: none
- Storage buckets/objects: none
- Current Security and Performance Advisor findings: none

Before using it, rename the organization display to `TBS` and the project to a clear temporary name such as `tbs-operations-temp`, confirm that its region is acceptable for temporary Texas field testing, and record who owns cleanup. Do not treat its current email-derived project name as a production resource name. A different project may be created only after organization, region, and recurring cost are explicitly confirmed.

### Vercel candidate status

- No Vercel project is linked to this repository.
- The connected Vercel account exposes the `masermediagroup` team and no TBS Operations project.
- The user approved `masermediagroup` as the owner of this temporary Vercel deployment.
- Create a dedicated project such as `tbs-operations-temp`; do not reuse an unrelated existing Vercel project.

## Locked temporary-environment boundaries

1. Temporary means non-production data and recoverable infrastructure; it does not mean reduced authentication, permissive RLS, public media, shared secrets, or a throwaway architecture.
2. The environment must display a persistent `Temporary shared test environment` indicator so it cannot be confused with production.
3. Use the existing empty Supabase project only after it is explicitly approved and renamed. Do not create or bill a second project automatically.
4. Use a dedicated Vercel project in `masermediagroup` and a stable HTTPS alias. A random per-deployment preview URL is not the primary mobile test URL.
5. Vercel's Production target may host this stable temporary site, but its data remains temporary. No production TBS cutover is implied by the Vercel target name.
6. Never connect any Vercel Preview deployment to a future production Supabase project. Preview variables must fail closed unless a preview-specific database is intentionally configured.
7. Keep the schema-v5 IndexedDB database intact and export a verified backup before shared-data migration. The local copy remains the rollback source through the validation window.
8. Do not add Phase 7 offline queuing, Phase 8 QR tables/routes, Phase 9 map geometry, or Phase 10 reporting views during this temporary Phase 6 implementation.

## Required owner decisions and access

These are setup gates, not coding questions:

| Gate | Required decision or access | Owner |
| --- | --- | --- |
| Supabase project | Approved: use the existing empty project; rename the organization display to `TBS` and the project to `tbs-operations-temp` | TBS infrastructure owner |
| Vercel ownership | Approved: create/link a dedicated temporary project in `masermediagroup` | TBS/Vercel owner |
| Stable URL | Approve a stable `vercel.app` alias or TBS staging subdomain | TBS/Vercel owner |
| Entra tenant | Deferred: required before production readiness, not before temporary testing | Microsoft 365 administrator |
| Entra application | Deferred: create the single-tenant web registration after temporary shared-workflow validation | Microsoft 365 administrator |
| Test identities | Provide one Operator account. Reuse the existing bootstrap Administrator only for setup; defer Manager, additional Administrator, and no-membership human test accounts | TBS operations/admin |
| Site membership | Confirm which users receive Lavon access; do not grant the planned warehouse until its site is intentionally created | TBS operations/admin |
| Test data | Approve synthetic fixtures for normal testing and separately approve any real backup used for parity rehearsal | TBS data owner |
| Source control | Restore or initialize a TBS-owned Git repository suitable for Vercel integration | Repository owner |

## Environment topology

```text
Desktop browser ─┐
Phone / tablet ──┼── HTTPS ──> Vercel: tbs-operations-temp
Local developer ─┘                    │
                                      ├── Supabase Auth / controlled test accounts
                                      ├── Postgres Data API + RLS
                                      └── Private Storage + RLS

Schema-v5 IndexedDB backup ──dry run/import──> temporary Supabase project
Repository migrations/types/tests ──────────> fresh future production project
```

### Vercel environment policy

- **Production environment of the dedicated temporary Vercel project:** points only to the temporary Supabase project and owns the stable field-test URL.
- **Development environment:** may point to the same temporary Supabase project after the test-data policy is approved. Local actions must be visibly marked as shared, not device-local.
- **Preview environment:** contains no database variables by default. If previews become necessary, use branch-scoped variables and a Supabase branch or a separately approved test project. Supabase branching is optional, plan-dependent, and not required for this first validation.
- Deployment Protection must not interrupt normal temporary login and mobile testing. The app's Supabase session checks, authorization, and RLS remain the security layers. Automated tests may use a Vercel automation-bypass secret stored only in CI.

### Required environment variables

Commit `.env.example` with names and empty values only. Store actual values in Vercel and untracked local environment files.

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public by design | Temporary project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public by design | Current publishable key; do not use the legacy anon key for new setup |
| `NEXT_PUBLIC_APP_URL` | Public | Stable temporary Vercel origin used for callback construction and display |
| `APP_ENVIRONMENT` | Server only | `temporary`, used for fail-closed configuration and environment labeling |
| `INVENTORY_DATA_BACKEND` | Server only | Explicit `supabase`; local development must choose intentionally |

Do not place test passwords, a future Entra client secret, Supabase secret/service-role key, database password, or CI test credentials in browser variables. A future Entra secret belongs in Supabase Auth provider configuration. A Supabase secret key may be used by a tightly scoped setup/migration/import/CI job, but it must never be available to the deployed application runtime.

## Architecture changes to validate

### Preserve the workflow interface, replace the snapshot transaction shape

The current React workflow components and their use-case inputs should remain recognizable. The SQL adapter must not pretend that a relational shared database is one browser snapshot:

- Keep UI-facing commands such as `saveReceiptDraft`, `completeReceipt`, `moveMaterial`, `recordIssue`, and `departOutboundBatch`.
- Retain the in-memory adapter for fast domain tests and the IndexedDB adapter only for local backup/import/rollback concerns.
- Move authoritative transactions to server/database command modules. Do not download every authorized table, modify a snapshot, and overwrite it.
- Add permission-scoped read models for the Inventory provider instead of exposing the whole database shape.
- Keep TanStack Query inside the Inventory route subtree for interactive invalidation and mutation state. The shared application shell remains server-rendered.

This is an intentional refinement of the older phrase "replace the adapter behind unchanged ports." The user-facing use cases remain stable; the snapshot-shaped production persistence interface does not.

### Shared command interface

Use a small, versioned command envelope suitable for Phase 7 replay:

```text
POST /api/inventory/commands/v1
  commandId: UUID
  commandType: discriminated command name
  commandVersion: 1
  siteId: UUID
  entityVersion/baseVersions: as required
  payload: Zod-validated use-case data
```

The Route Handler must:

1. Revalidate the Supabase JWT claims and load the Profile/Site Membership.
2. Reject unassigned sites and insufficient roles without revealing the target record.
3. Validate the command envelope and command-specific payload with Zod.
4. Derive `actorUserId` and the immutable `actorName` snapshot on the server. Never trust a submitted operator name after authentication.
5. Invoke one atomic database command.
6. Return a structured result: success, validation error, unauthenticated, forbidden, not found, version conflict, duplicate/idempotent replay, or retryable infrastructure error.

Each database command runs in one Postgres transaction, enforces invariants again, writes operational records, Activity, and Audit history, and records the command ID. Prefer `security invoker` database functions callable only by `authenticated`; do not default to `security definer`. If a private security helper is genuinely required to avoid RLS recursion, it must validate `auth.uid()`, set an empty search path, live outside exposed schemas, and have public execution revoked.

### Shared reads

- Server Components and the Inventory provider receive only the selected user's assigned-site read model.
- Add a permission-scoped bootstrap/read endpoint only where the client provider needs refreshable data.
- Use stable UUIDs as relationships and keep slugs for routing/presentation only.
- Support conditional refresh with dataset/entity versions so Phase 7 can later request deltas without redesigning command responses.
- Do not add Realtime until a measured workflow requires it. Normal query invalidation after commands is sufficient for Phase 6.

## Database and Storage plan

### Schemas and records

Create ordered migrations for the current repository model, not the old roadmap examples:

- Identity/security: `profiles`, `site_memberships`, fixed roles, bootstrap-administrator audit, command/idempotency receipts, and database audit records.
- Foundation: `sites`, `storage_locations`, storage-position fields, `projects`, `project_aliases`, `material_groups`, `material_lots`, `photos`, `verification_records`, and `activity_events`.
- Receiving: `receipts` and `receipt_lines` with unresolved identity and original handwritten-label evidence.
- Movement: `material_movements` and `movement_lines` with full/partial lineage and reversal links.
- Outbound: `outbound_batches` and `outbound_lines` with reservations, departure lineage, and compensating reversals.
- Issues: `issues`, `issue_comments`, and `issue_transitions` with complete entity links and immutable history.
- Media staging: upload intents/staged objects so required Receiving and damage evidence can be validated before an operational command consumes it.

Use UUID primary/foreign keys, `timestamptz` UTC timestamps, integer or null quantities, checks/check constraints for known states, explicit unknown values, indexed foreign keys, entity versions, unique command IDs, and workload-driven composite/partial indexes. Do not create editable aggregate pallet/box/project totals.

### Data API exposure and privileges

Current Supabase projects no longer guarantee that new `public` tables are automatically exposed through the Data API. Every migration must explicitly declare intended schema exposure and grants.

- Revoke operational access from `anon`.
- Grant `authenticated` only the table/view operations and command execution each workflow needs.
- Keep internal helpers and import bookkeeping outside exposed schemas where practical.
- Enable and force RLS where appropriate on every exposed operational table.
- Do not confuse Data API grants with RLS; both must be correct.
- Use `security_invoker` for later reporting/read views so site policies continue to apply.

### RLS model

- `profiles.id` maps to `auth.users.id` and stores display name plus active state.
- `site_memberships` is the current authorization source. Do not authorize from user-editable `user_metadata`.
- Operator and Manager access is restricted to active memberships for the row's `site_id`.
- Administrator global access is explicitly controlled in protected profile/membership data and never self-assignable.
- Index every membership and site key used by RLS. Wrap stable auth functions such as `auth.uid()` in `select` where recommended for policy performance.
- Separate policies by operation. `UPDATE` policies include the required `SELECT`, `USING`, and `WITH CHECK` coverage.
- Test policies through the publishable key as anon, authenticated-no-membership, every role, assigned site, and unassigned site.

### Private media workflow

Create one private operational-media bucket with upload restrictions for approved image types and measured file-size limits.

1. An authenticated assigned-site user requests an upload intent for a command.
2. The image uploads to a non-guessable site/user/command path.
3. The server records checksum, content type, size, original filename, and immutable entity intent; no public URL is stored.
4. The operational command consumes valid staged uploads and creates Photo metadata atomically with its database records.
5. Failed commands leave no partial lots/receipts/issues. Unconsumed staged objects are visible to administrators and removed by an explicit reconciliation task after the retention window.

Receiving completion must verify at least one material image for every line. A new Damaged Issue must verify linked damage evidence. Movement, verification, outbound, comments, and non-damage Issues may complete without a photo.

Storage RLS must cover `SELECT`, `INSERT`, `UPDATE`, move/copy, and delete behavior separately. Operators must never be able to list or download media from an unassigned site. Media access uses authenticated download or short-lived signed access, never a public bucket.

## Authentication and authorization plan

### Temporary authentication configuration

Temporary testing may use Supabase email/password authentication with these restrictions:

1. Disable public sign-up. The application exposes sign-in only; it does not expose account creation or password-reset enrollment.
2. Create a small fixed set of test users through the Supabase Auth dashboard or a one-time server-only administrative setup script. If a script is used, its secret key remains local/CI-only and is removed immediately after provisioning.
3. Mark the controlled test users' emails as confirmed during administrative creation so temporary testing does not depend on SMTP or magic-link delivery.
4. Store passwords only in the approved password manager or test runner secret store. Never commit them or place them in Vercel browser/runtime variables.
5. Create one Operator identity for normal desktop and mobile demo use. Reuse the existing bootstrap Administrator only for activation and maintenance. Do not create Manager, additional Administrator, or authenticated-with-no-membership human identities until the company authentication phase.
6. Keep the normal `@supabase/ssr` cookie, `auth.getClaims()`, Profile, Site Membership, Route Handler, RLS, and private Storage architecture. Only the identity provider is temporary.
7. Label these accounts and their records as temporary. They are deleted/revoked during teardown and are not migrated into the future production project.

This method validates sessions, authorization, roles, site isolation, private media, and cross-device behavior without waiting for Microsoft 365 administration. Supabase's default SMTP is not part of this plan.

### Deferred Microsoft Entra conversion

After shared-workflow testing succeeds and before Phase 6 can be called production-ready:

1. Register a single-tenant Web application in the TBS Microsoft Entra tenant.
2. Add the Supabase callback exactly as `https://<project-ref>.supabase.co/auth/v1/callback` in Entra.
3. Configure Azure in Supabase Auth with the client ID, secret, and `https://login.microsoftonline.com/<tenant-id>` tenant URL. Do not use the permissive `common` tenant.
4. Configure the stable application callback URL, use PKCE, and validate any `next` destination as a same-origin path.
5. Run the full Entra success, tenant-restriction, cancellation, callback-tampering, and mobile-return test matrix.
6. Disable the temporary password provider for normal users, revoke/delete temporary users and sessions, and verify that no temporary credential remains in Vercel or the repository.

Deferring Entra is an approved temporary-plan deviation. It does not change the Phase 6 v1 production requirement.

### Next.js session shape

- Install and pin current compatible `@supabase/supabase-js` and `@supabase/ssr` packages; commit the lockfile.
- Create request-scoped server clients and the singleton browser client only where a browser Supabase operation is required.
- Use `proxy.ts` to refresh cookies and call `auth.getClaims()`. Preserve Supabase's response cookies and anti-cache headers.
- Do not trust `auth.getSession()` in server authorization paths.
- Keep Proxy checks optimistic. Every Server Component data module, Route Handler, database function, and RLS policy rechecks access.
- Add `/login`, `/auth/callback`, `/auth/error`, `/unauthorized`, sign-out, session-expired, pending-membership, and disabled-profile states.
- Keep public signup disabled. An authenticated identity with no active membership receives no operational data or navigation.

### Actor behavior

- Imported pre-authentication history preserves the exact typed `operatorName` with `actorUserId = null`.
- New authenticated mutations require a real user ID and snapshot the approved Profile display name. Repeated free-text operator fields are replaced with a visible `Acting as` identity after Supabase cutover.
- Assignment/history names remain snapshots even if a user's display name later changes. Optional assignee user IDs may be added without deleting the historical assignee name.

### Bootstrap administrator

Self-promotion is prohibited. After the controlled temporary Administrator account is created, a one-time audited migration/SQL bootstrap assigns Administrator to its known auth UUID. That Administrator then creates site memberships through the protected application surface. Remove or disable any bootstrap-only mechanism immediately after use. Repeat the bootstrap process with an approved Entra identity only in the future fresh production environment.

## Local-backup migration rehearsal

1. Export the current schema-v5 archive and verify every record/media checksum before shared work begins.
2. Run a local/browser dry-run that validates archive format, schema version, UUIDs, relationships, site consistency, quantities, lineage, Issue evidence, and media manifests.
3. Create an import session with immutable manifest/checksum and Administrator identity.
4. Upload media in bounded chunks directly to private staged Storage. Do not send one base64-heavy archive through a single Vercel request.
5. Import records in dependency order with idempotent batch keys and original timestamps/operator names.
6. Finalize only after record counts, per-entity checksums, relationship checks, and media counts/checksums match.
7. Produce an exportable parity report and record every consciously accepted exception.
8. Keep the original IndexedDB database and archive read-only throughout the agreed verification window.

Use synthetic data for ordinary testing. A real TBS backup may enter the temporary project only after data-owner approval and must be deleted at the end of the exercise unless the owner explicitly extends retention.

## Implementation sequence

### Stage 0 — Ownership and configuration gates

- Approve/rename the clean Supabase candidate and select the TBS-owned Vercel target.
- Restore Git/source-control ownership and create the stable deployment URL.
- Provision the single controlled Operator password account with public signup disabled; retain the existing bootstrap Administrator for setup and record Entra as a deferred production gate.
- Record test identities, site memberships, data classification, retention, and cleanup owner.

Exit: no unresolved infrastructure owner, OAuth owner, or data-owner question.

### Stage 1 — Repository infrastructure

- Add the pinned Supabase runtime packages and CLI workflow.
- Add `supabase/config.toml`, ordered migrations, synthetic seed fixtures, generated database types, `.env.example`, and environment validation.
- Add migration, reset, type-generation, advisor, and integration-test commands without exposing secrets.

Exit: a fresh database can be recreated from repository files and has no schema drift.

### Stage 2 — Relational schema, commands, RLS, and private media

- Implement the current schema-v5 relational model, indexes, append-only/audit behavior, command receipts, and staged uploads.
- Implement role/site RLS and explicit grants/Data API exposure.
- Run Security and Performance Advisors after every DDL group and resolve or document every finding.

Exit: direct publishable-key tests prove deny-by-default access and atomic command behavior before UI integration.

### Stage 3 — Temporary Supabase authentication and application shell

- Implement SSR clients, `proxy.ts`, temporary password login/error/sign-out states, Profile, memberships, role-aware navigation, and site selection.
- Replace placeholder identity and derive actor information server-side.

Exit: the Operator can authenticate on desktop and mobile; automated policy tests prove no-membership/disabled denial; sessions refresh correctly. Entra remains explicitly unverified.

### Stage 4 — Operational vertical slices

Move one complete workflow at a time to the shared command/read interface:

1. Read-only Inventory/project/material/storage/search.
2. Verification and Add Project Material.
3. Receiving drafts/completion and required photo evidence.
4. Movement and reversal.
5. Outbound planning/readiness/departure/reversal.
6. Issues, damage evidence, assignment, comments, resolution/reopen.
7. Activity and administration/audit surfaces.

Each slice must pass its domain, RLS, desktop, mobile, and accessibility tests before the next slice changes backend ownership.

Exit: no workflow component reads IndexedDB directly or submits an unverified operator identity in Supabase mode.

### Stage 5 — Import, Vercel deployment, and field validation

- Rehearse dry-run/import/parity with synthetic fixtures, then with an approved archive if authorized.
- Deploy the same validated artifact to the stable temporary Vercel URL.
- Configure production-scoped variables only for this dedicated temporary Vercel project.
- Exercise temporary Supabase login, private media, role/site restrictions, and all yard workflows on desktop and supported phones.

Exit: shared actions made on one device appear correctly on another after refresh, with complete actor/audit/media evidence.

### Stage 6 — Teardown or production-decision gate

- Export the final test/parity/security report and preserve repository migrations.
- Remove real operational records from the temporary project according to retention approval.
- Revoke temporary test memberships/accounts and sessions, CI credentials, and unused environment variables. Remove Entra configuration later only if it was added during the conversion gate.
- Pause or delete temporary infrastructure only after explicit owner approval; do not delete it automatically.
- If production is approved, create a fresh production Supabase/Vercel configuration and run the Phase 6 cutover plan. Never silently relabel temporary test data as production.

## Desktop, mobile, and field test matrix

| Area | Desktop | Mobile/real device | Security/data evidence |
| --- | --- | --- | --- |
| Temporary Auth session | Sign in/out, refresh, expired session | Safari/Chrome sign-in, password-manager behavior, orientation | No-signup, no-membership, and disabled-user denial logs |
| Site access | Switch assigned sites; no unauthorized rows | Compact site selector when needed | Direct unassigned-site query denied |
| Receiving | Full draft/review/completion | Camera capture, reload/resume, touch targets | Required per-line media; atomic completion |
| Movement | Full/partial/batch/reversal | One-handed lot/destination flow | Version conflict and idempotent replay |
| Outbound | Plan/ready/depart/reverse | Count confirmation and optional evidence | Blocking Issue and stale-lot protection |
| Issues | Filter/detail/lifecycle | Record damage, camera, comments, resolve | Damage image required; other photos optional |
| Private media | Authorized preview/download | Capture/upload/retry on cellular/Wi-Fi | Cross-site/list/download denial |
| Shared state | Device A changes, Device B refreshes | Phone action appears on desktop | Actor name/user ID, Activity, Audit parity |

Phase 6 remains online-required. Airplane-mode queues, background sync, cached offline lookup, and conflict inbox are Phase 7 tests, not temporary Phase 6 acceptance criteria.

## Automated and manual validation

- Full ESLint, strict TypeScript, unit tests, Next.js production build, desktop/mobile Playwright, and axe checks.
- Fresh migration, reset/reapply, populated migration, generated-type drift, and rollback rehearsal.
- Database integration tests for every command, check constraint, lineage rule, idempotency key, entity-version conflict, and immutable event.
- RLS matrix for anon, authenticated/no membership, Operator, Manager, Administrator, assigned Lavon, unassigned site, and inactive membership.
- Storage policy tests for list/read/upload/update/delete plus invalid path, MIME, size, and cross-site attempts.
- Temporary Auth tests for sign-in success/failure, disabled signup, expired cookie, disabled Profile, no membership, sign-out, and password leakage checks.
- Vercel deployment test with the stable URL, environment marker, secure cookies, no secret in client bundles, runtime error scan, and mobile HTTPS camera behavior.
- Temporary auth/RLS users may be provisioned by a CI-only administrative secret that is never injected into the application deployment. The deferred Entra conversion later adds its separate manual smoke tests.
- Run current Supabase Security and Performance Advisors after DDL and before acceptance. Record each result and remediation link.

## Downstream phase readiness

### Phase 7 — Mobile Yard Companion

Phase 6 must leave a stable versioned command envelope, client mutation IDs, per-entity versions, idempotent responses, private upload intents, and permission-scoped read models. Phase 7 will add cache manifests, offline queues, photo retry, sync conflicts, and service-worker behavior without changing the authoritative command meanings.

### Phase 8 — QR Labels

The temporary environment does not bypass the hardware/workflow gate. Do not create scan identifiers, QR routes, label tables, or print controls. Future `/scan/[token]` access must reuse authenticated session validation, site membership, and opaque identifiers only.

### Phase 9 — Yard Map

Use stable site/location UUIDs now so a future `SiteMapConfig` can reference them. Do not invent new-warehouse sites, outdoor zones, or geometry during Phase 6. Later map reads must use the same assigned-site RLS and canonical Storage counts.

### Phase 10 — Reporting and Operations Intelligence

Preserve UTC timestamps, unknown-versus-zero quantities, receipt dates, verification events, exposure state, immutable Issue transitions, outbound history, and audit records. Add workload indexes needed by current operational queries only. Phase 10 will add measured, permission-aware `security_invoker` read models and CSV exports later.

## Rollback and cleanup

- Before shared cutover, rollback is a configuration switch back to the verified IndexedDB path plus restoration of the pre-phase archive.
- Once authenticated shared mutations begin, do not merge divergent local and shared ledgers automatically. Stop writes, export both states, reconcile explicitly, and apply compensating records.
- Database migrations roll back with tested compensating migrations or project restore; operational evidence is not deleted to simulate rollback.
- Vercel rollback uses the last verified deployment artifact, but never promotes an artifact whose migration dependency is absent.
- Temporary data cleanup requires an exportable manifest, owner approval, and confirmation that no required parity/security evidence depends on the live project.

## Acceptance criteria

- The stable temporary Vercel URL supports controlled desktop and mobile Supabase password sign-in over HTTPS.
- Public signup is disabled, and no anonymous, no-membership, inactive, or unassigned-site user can read operational rows or media.
- Operator permissions work end to end. Manager and Administrator policy behavior remains implemented and automated-testable, but separate human accounts are intentionally deferred.
- Receiving and Damaged Issue evidence rules are enforced server-side and by the database command, while other actions do not require photos.
- Every successful command is idempotent, version-aware, site-aware, attributable to an authenticated Profile, and represented in Activity and Audit history.
- Shared operations performed on one device are visible on another without IndexedDB being authoritative.
- A schema-v5 backup dry-run and import produce documented record/media count and checksum parity.
- Migrations recreate a fresh database; Security and Performance Advisors have no unresolved critical findings.
- The temporary environment is visibly labeled, contains no runtime service-role secret, and has a documented retention/cleanup owner.
- Phase 7 offline behavior, Phase 8 QR, Phase 9 map geometry, and Phase 10 reporting have not been implemented.
- The temporary environment report explicitly states that Microsoft Entra was deferred and that Phase 6 is not production-complete until the Entra conversion gate passes.

## Final report requirements

Use the [shared final report](../README.md#shared-final-report) and add:

- Supabase project/region and Vercel project/domain identifiers without secrets.
- Temporary Auth configuration, account inventory without passwords, disabled-signup evidence, and the remaining Entra conversion checklist.
- Table/function/grant/RLS and role-action-site matrices.
- Storage bucket/path/policy matrix and required-photo evidence results.
- Migration and generated-type history, Advisor results, and database test results.
- Import dry-run, record/media parity, checksum report, and retained local rollback archive.
- Desktop and real-device/browser matrix, shared-state evidence, accessibility results, and Vercel runtime scan.
- Temporary-data retention and teardown decision.
- Explicit confirmation that no production cutover or later-phase implementation occurred.

## Current implementation references

- [Supabase SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase administrative user creation](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Supabase Microsoft Azure/Entra login](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase deployment and branching](https://supabase.com/docs/guides/deployment)
- [Supabase breaking-change changelog](https://supabase.com/changelog?types=breaking-change)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel preview environments](https://vercel.com/docs/deployments/environments)
- The installed Next.js 16.2.12 authentication, Route Handler, Proxy, cookie, and environment documentation in `node_modules/next/dist/docs/`.

## Decision log

- v1: Use a dedicated temporary Supabase project and dedicated stable Vercel site to validate the intended production architecture.
- v1: The existing clean TXBS Supabase project is a candidate, not an automatically approved target.
- v1 clarification: The user approved the existing empty Supabase project, the `TBS` organization display name, and `tbs-operations-temp` as the descriptive project name.
- v1 clarification: The user approved `masermediagroup` for the dedicated temporary Vercel project.
- v1 clarification: Microsoft Entra is deferred for temporary testing. Controlled administratively created password accounts with public signup disabled are authorized only for the disposable environment; Entra remains mandatory before production readiness.
- v1 clarification: Temporary human testing uses one Operator account. The existing bootstrap Administrator is retained only for setup and maintenance; Manager, additional Administrator, and no-membership accounts are deferred until the company authentication phase.
- v1: Preserve UI-facing use cases, but do not implement Supabase as a whole-snapshot persistence adapter.
- v1: Use authenticated, versioned, idempotent server commands and database transactions as the Phase 7-ready seam.
- v1: Derive actor identity from the authenticated Profile while preserving imported historical operator names.
- v1: Test data and infrastructure are disposable; migrations, policies, tests, and import evidence are the promotable assets.
