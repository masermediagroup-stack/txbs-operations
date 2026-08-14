# Phase 6 Shared Demo Implementation Report v1

- Report date: 2026-08-12
- Source plan: [Phase 6 v1](v1.md)
- Temporary plan: [temporary-validation-plan-v1.md](temporary-validation-plan-v1.md)
- Implementation plan: [implementation-plan-v1.md](implementation-plan-v1.md)
- Status: Shared demo implementation and Vercel deployment complete; single-Operator field activation remains

## Implemented behavior

- Replaced device-local online authority with permission-scoped Supabase reads and use-case-specific shared commands for material addition, verification, Receiving, Movement, Outbound, and Issues.
- Kept the existing Inventory TanStack Query boundary and IndexedDB adapter. Authenticated online sessions use Supabase; IndexedDB remains the offline cache, recovery source, and Phase 7 queue companion.
- Added authenticated, versioned command and snapshot Route Handlers. Commands use client UUIDs, entity versions, structured errors, atomic database execution, idempotent command receipts, Activity, and append-only Audit evidence.
- Added private media staging and authenticated download routes. Receiving completion requires 1–3 material photos for every active receipt line; Movement accepts 0–3 optional proof photos; and a new Damaged Issue requires damage evidence. Other workflow photos remain optional.

### Field-test correction — 2026-08-14

- Phase 6 Operator testing identified that Receiving and Movement accepted only one selected file.
- The shared and offline evidence pipeline now accepts up to three files, preserves each as an independent private Photo record, and rejects a fourth file in the browser, local service, command schema, and database command boundary.
- Migration `20260814120000_multiple_receiving_movement_photos.sql` preserves the existing command route and idempotency contract while attaching all selected photos in the same transaction.
- Activated Phase 7 foreground/manual replay against the shared command endpoint, including queued image upload, completed-command removal, duplicate protection, and human-readable version conflicts.
- Added an Administration surface and protected database function for profile activation, fixed-role assignment, and site membership configuration.
- Imported the current repository baseline idempotently: 18 projects, 36 material groups, 36 present lots, 36 project notes, and 54 Activity events at Lavon Yard.

## Temporary account decision

- Normal demo use requires one administratively created Supabase password account assigned the `Operator` role at Lavon Yard.
- The existing bootstrap Administrator remains only for activating that Operator and maintaining the disposable environment.
- Separate Manager, additional Administrator, and no-membership human accounts are deferred until company authentication is introduced.
- The three-role schema, authorization checks, and database policies remain implemented. Automated tests can exercise privileged and denied states without expanding the temporary human account inventory.

## Routes, interfaces, and infrastructure

- New authenticated routes: `/api/inventory/snapshot`, `/api/inventory/commands/v1`, `/api/inventory/uploads`, and `/api/inventory/media`.
- Updated route: `/administration` now manages profiles, role assignment, activation, and site membership.
- New shared command domain envelope, Supabase read repository, remote Inventory service, and shared/offline provider selection.
- New database migrations:
  - `20260812165000_phase_06_shared_inventory_commands.sql`
  - `20260812184500_phase_06_administration.sql`
- New repeatable baseline generator: `scripts/generate-phase6-seed-sql.ts`.
- Temporary Supabase project: `iixiigkevuqwewtagtee`, PostgreSQL 17.6, `us-west-2`.
- Temporary Vercel project: `masermediagroup/tbs-operations-temp`; stable alias: `https://tbs-operations-temp.vercel.app`.

## Security and data behavior

- RLS is enabled on every exposed operational table; anonymous operational access is denied.
- Private `operational-media` objects are accessed only through authenticated application boundaries.
- Database command and administration functions independently validate `auth.uid()`, active Profile, fixed role, site membership, command identity, and record state. Public/anonymous execution is revoked.
- Historical free-text operator names remain intact. New shared commands snapshot the authenticated Profile name and user ID.
- Supabase Security Advisor reports leaked-password protection as an environment configuration recommendation. It also identifies the two intentional authenticated `SECURITY DEFINER` command boundaries; both have empty search paths, explicit actor/role/site checks, and no anonymous execution.
- No service-role key, database password, user password, or other server secret is present in the deployed application contract.

## Migration, compatibility, and rollback

- Ordered repository migrations were applied successfully to the live temporary project.
- A live authenticated `material.add` transaction succeeded and was rolled back, proving the production command boundary without leaving test data.
- The repository baseline import is deterministic and idempotent. It does not invent exact positions, quantities, brands, handling facts, or warehouse geometry.
- Existing device IndexedDB records are not deleted. If a device contains meaningful records beyond the imported baseline, export its schema-v5 archive before shared demo use and reconcile it explicitly.
- Full archive/media parity import remains a company-production cutover gate; disposable demo data is not silently promoted to the future provider.

## Validation evidence

- `npm run typecheck`: passed with strict TypeScript.
- `npm run lint`: passed.
- `npm test`: 35 tests passed.
- `npm run build`: passed on Next.js 16.3.0 with Turbopack.
- Production-mode Playwright suite: 38/38 passed using four workers across Desktop Chrome and Pixel 7 projects.
- Axe WCAG 2/2.1 A/AA coverage passed on Overview, Receiving, Outbound, Issues, Movement, and the Phase 7 sync experience.
- Browser acceptance confirms required Receiving/damage evidence, optional Movement/Outbound photos, movement reversal/history, responsive workflows, installability, offline journaling, and accessible navigation.

## Remaining field activation

1. Create one confirmed Supabase password user for the Operator; keep public signup disabled.
2. Sign in as the existing bootstrap Administrator and activate that Profile as `Operator` with Lavon Yard membership.
3. Sign in with the same Operator account on desktop and phone, then run the cross-device checklist in [demo-setup-guide-v1.md](demo-setup-guide-v1.md).
4. Record the temporary-data retention owner and keep Entra, custom SMTP, and the future company database/storage decision as later cutover gates.

## Deployment evidence

- Vercel Production deployment `dpl_HQwviL4B4jV9QCzwuDvGWZUGmoFD` completed successfully and is aliased to `https://tbs-operations-temp.vercel.app`.
- The clean remote build detected Next.js 16.3.0, passed TypeScript, compiled successfully, and generated 80 routes.
- Live smoke checks returned `200` for `/login` and `/manifest.webmanifest`; an unauthenticated `/api/inventory/snapshot` request returned a `307` redirect to the validated login path.
- The initial post-deploy Vercel error-log scan returned no errors.

## Known limitations and intentional deviations

- Microsoft Entra is intentionally deferred. Supabase password accounts are authorized only for the disposable demo.
- Custom SMTP is not configured; an Administrator must reset the temporary Operator password in Supabase Dashboard until mail delivery is configured.
- A separate Manager and additional Administrator are not required for this demo. Manager-only human acceptance is deferred while database authorization remains in place.
- The temporary project is a shared demonstration system, not the final company production environment.
- Phase 8 QR Labels, Phase 9 Yard Map, and Phase 10 Reporting were not started as part of this Phase 6 work.
