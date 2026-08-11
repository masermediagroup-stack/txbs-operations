# Phase 1.3 Implementation Report v1

- Completed: 2026-08-06
- Status: Implemented

## Implemented behavior

- Normalized site-aware Material Groups and Material Lots with UUID identities, UTC timestamps, package type, integer-or-unknown quantity, location precision, condition, protection, accessibility, handling requirements, photos, verification history, durable issues, and append-only activity.
- Added the 14-day Needs verification rule and lot-derived project, material, and storage totals.
- Added the Inventory-only TanStack Query boundary, versioned IndexedDB persistence, stale-revision protection, first-run seed migration, an in-memory test adapter, and portable backups containing media plus SHA-256 checksums.
- Added alias/field-label-aware Project Finder matching with match explanations.
- Added Add project material, Confirm still here, exact/general/unknown positions, photo capture, handling warnings, Record issue, and backup import/export workflows.
- Converted project, material, storage, activity, and issues surfaces from aggregate mock counts to the durable lot ledger.
- Removed `/inventory/trailers` and corrected `/deliveries` to future cross-operational delivery terminology.

## Routes and domain changes

- Preserved all existing active Inventory routes and removed `/inventory/trailers`.
- Added `Site`, `StoragePosition`, `ProjectAlias`, `MaterialGroup`, `MaterialLot`, `PhotoRecord`, `VerificationRecord`, `ActivityEvent`, and durable `Issue` definitions.
- Added ADR 0005 and updated the domain glossary.

## Migration and intentional deviations

- Each legacy Material Group becomes one `Mixed` Material Lot. Its known pallet-plus-box package count is the lot quantity, and the original split remains in the migration note. This satisfies the one-lot migration without fabricating an exact package type or field position.
- Legacy exact position, condition, protection, accessibility, restrictions, aliases, and photos are not inferred. They remain unknown or absent until field verification.
- The backup is a portable `.tbsops.json` archive rather than ZIP; it contains the versioned dataset and original image bytes with checksums.

## Validation

- ESLint: passed with no warnings at phase closure.
- Strict TypeScript: passed.
- Unit tests: 11 passed at phase closure, including migration, seven-Conex preservation, alias search, lot totals, verification, and required operator names.
- Next.js 16 Turbopack production build: passed.
- Desktop/mobile browser flows: route rendering, project search, workspace navigation, and axe checks passed; the E2E assertion was updated to wait for a single settled page heading during client navigation.

## Known risks and rollback

- IndexedDB is device-local and does not provide cross-device sync before Phases 6 and 7.
- Very large photo collections produce large JSON backups; storage-pressure UX remains a Phase 7 concern.
- Rollback is restore-from-backup or replacement with the immutable seed. Existing records are never silently reset.

At Phase 1.3 closure, Phase 2 implementation had not started.
