# Phase 6 Shared Demo Cutover Implementation Plan v1

- Plan version: v1
- Source plans: [Phase 6 v1](v1.md) and [temporary validation plan v1](temporary-validation-plan-v1.md)
- Repository audit: 2026-08-12
- Status: Implementation in progress
- Environment: Disposable Supabase and Vercel demo environment

## Objective

Finish Phase 6 by making the existing Inventory workflows use one authenticated, site-aware Supabase data set across desktop and mobile browsers. Keep Supabase password accounts for the demo. Microsoft Entra and any company-selected database or object-storage provider remain later infrastructure substitutions behind the same application ports.

## Current baseline and conflicts

- The application is now Next.js 16.3.0 and retains the App Router modular-monolith architecture.
- Supabase Auth, the Lavon site and ten confirmed locations, the normalized operational schema, RLS, append-only records, command receipts, audit records, and a private `operational-media` bucket already exist.
- The deployed schema is empty apart from reference data. Inventory screens still use the schema-v5 IndexedDB snapshot as their authoritative store.
- Phase 7 has implemented installability, local cache/journal infrastructure, queued mutation identifiers, offline status, and conflict records, but shared replay is intentionally blocked until Phase 6 exposes durable commands.
- The older phrase “replace local repositories behind unchanged ports” is preserved at the use-case boundary, not as a full-snapshot database overwrite. Shared commands remain narrow and transactional.

## Implementation sequence

1. Add a permission-scoped Supabase read model that maps normalized tables into the existing Inventory view snapshot without exposing unauthorized sites.
2. Add a versioned authenticated command route and narrow atomic database command functions for material, verification, receiving, movement, outbound, and Issue workflows.
3. Stage image blobs in private Storage before a command. A command consumes only uploads owned by its authenticated actor and site.
4. Derive the authenticated actor ID and immutable profile display name at the database boundary. Preserve existing entered operator names as historical workflow evidence during the demo transition.
5. Record every accepted command in `command_receipts`; write Activity and append-only Audit records in the same transaction; return duplicate replays idempotently.
6. Add a Supabase client repository to the existing Inventory TanStack Query boundary. Keep IndexedDB as the offline cache, portable backup source, and rollback path.
7. Import the current seed or a schema-v5 backup with dry-run validation, referential checks, photo checksums, count parity, and idempotent reruns.
8. Connect the Phase 7 journal to the command route, replay online commands in order, and move version conflicts into the existing conflict inbox.
9. Add administrator setup guidance for creating one Operator demo account and assigning Lavon membership. Reuse the existing bootstrap Administrator only for account activation and configuration; defer separate Manager, additional Administrator, and no-membership test identities.
10. Validate desktop/mobile parity, RLS denial cases, private media, duplicate commands, offline replay, migrations, TypeScript, lint, unit tests, production build, Playwright, and accessibility.

## Authentication and provider boundary

- Demo authentication uses Supabase email/password accounts created by an administrator. Public signup remains disabled.
- Entra is not an implementation blocker for this temporary environment.
- UI code depends on the application session/profile and use-case interfaces, not Supabase provider objects.
- Database reads and commands live behind feature-owned repositories and Route Handlers. Storage paths and signed access live behind the media repository.
- A future company database, storage service, or Entra setup replaces adapters and environment configuration rather than operational components.

## Authorization

- Operator: assigned-site receiving, material, verification, movement, outbound, and Issue commands.
- Manager: Operator abilities plus corrections, Issue resolution, outbound approval, exports, and audit access.
- Administrator: global site access plus profiles, memberships, imports, and configuration.
- Every Route Handler authenticates the session and every database command independently checks the active profile, role, and site.
- Anonymous users and authenticated users without a matching membership receive no operational rows. Administrators are explicitly global.
- The three-role authorization model remains in the schema and command boundaries so later company authentication does not require a redesign. For this disposable demo, the account inventory is intentionally limited to the existing bootstrap Administrator plus one active Lavon Operator; Manager and additional Administrator accounts are deferred.

## Media rules

- Receiving completion requires at least one material image for every receipt line.
- A new Damaged Issue and its completion require linked image evidence.
- Material addition, verification, movement, outbound, comments, and non-damage Issues keep optional photos.
- Objects remain private and are downloaded through authenticated access or short-lived signed URLs.

## Migration and rollback

- All DDL is repository-owned and applied as ordered Supabase migrations.
- The schema-v5 backup remains the rollback artifact until shared-data count and media parity are confirmed.
- Imports are dry-run first and use checksums plus stable UUIDs; rerunning the same archive must not duplicate records.
- Demo data is disposable and is never silently promoted to the future company production environment.

## Acceptance criteria

- Two authenticated devices see the same receiving, movement, outbound, verification, and Issue changes after refresh.
- The one Operator account can access Lavon workflows but cannot use Manager/Administrator-only actions. Automated policy tests continue to cover privileged and denied role states without requiring additional human demo accounts.
- Required Receiving and damage photos survive cross-device access and cannot be opened from an unauthorized account.
- Commands are atomic, version-conflict aware, idempotent, and produce Activity plus Audit records.
- Offline Phase 7 commands and photo blobs replay when connectivity returns; conflicts remain visible for a person to resolve.
- A schema-v5 archive imports with record and media parity and can be rerun safely.
- The application passes lint, strict TypeScript, unit tests, production build, desktop/mobile Playwright, and axe checks.
- The final report explicitly records any deferred Entra, SMTP, custom-domain, and future company-provider work. Phase 8 is not started.

## Temporary account scope decision

- Create one Supabase password account for the yard Operator used in desktop and mobile demonstrations.
- Keep the existing bootstrap Administrator account solely for activating the Operator, assigning Lavon membership, and maintaining the temporary environment.
- Do not create a Manager, an additional Administrator, or a no-access human test account during this temporary demo phase.
- Preserve Operator, Manager, and Administrator authorization rules in code and database policies; expanding the account inventory is deferred until the company authentication and production-access phase.
