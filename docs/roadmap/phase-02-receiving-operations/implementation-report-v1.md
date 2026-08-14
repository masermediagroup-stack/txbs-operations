# Phase 2 Implementation Report v1

- Completed: 2026-08-06
- Status: Implemented

## Implemented behavior

- Activated `/inventory/receiving` as identify → match or flag → inspect → photograph → record packages → confirm handwritten label → assign staging/storage → review → receive.
- Supports multiple receipt lines, whole-number or explicitly unknown quantities, document/label/material photos, material condition and handling requirements, and line-level storage assignment.
- Drafts survive reloads and can be reopened. Duplicate receipt numbers show warnings and never merge automatically.
- Completing a matched Receipt atomically creates groups, lots, verifications, evidence links, damage issues where applicable, and activity history.
- Completing an unmatched Receipt preserves all evidence and creates a linked `Unknown shipment` Issue without creating unassigned lots.
- Added Receiving to Inventory navigation while preserving all prior entries’ relative order.

## Routes and domain changes

- Activated `/inventory/receiving`; no other Phase 2 routes were added.
- Added `Receipt`, `ReceiptLine`, receipt identity/inspection/status states, receipt-linked photos, and schema version 2.
- Added ADR 0006 and expanded the domain glossary.

## Migration and rollback

- Schema version 1 IndexedDB records and backups migrate to version 2 by adding receipt collections and nullable receipt photo links. Existing lots, photos, history, and operator names are preserved.
- A completion failure leaves the saved draft and creates no partial material lots.
- Rollback uses a pre-phase backup; imported archives are validated before replacing local data.

## Validation

- ESLint and strict TypeScript: passed.
- Unit tests: 14 passed, including known and unknown receipts, multiple lines, unknown quantities, draft recovery, issue creation, and failed-completion atomicity.
- Next.js 16 Turbopack production build: passed.
- Desktop/mobile Playwright: 12 passed across the shared route, navigation, search, receiving, and responsive flows.
- Axe: no WCAG 2 A/AA or 2.1 A/AA violations on the Overview or Receiving acceptance views at desktop and Pixel 7 viewports.

## Intentional limits and risks

- The UI captures files the browser exposes; OCR, vendor/procurement records, delivery scheduling, generated labels, and QR codes remain excluded.
- Device-local drafts do not sync across devices and display that limitation explicitly.
- Identity resolution for a completed unknown shipment is preserved for the Phase 5 issue-resolution workflow.

Phase 3 was not started.

## Current operational rule amendment — 2026-08-07

- Completing Receiving now requires 1–3 material photos for every receipt line, including unresolved shipments.
- A draft may still be saved without photos so field work is not lost.
- Previously saved material photos remain attached when a draft is reopened or resaved and satisfy the completion requirement.
- Reopened drafts enforce the three-photo maximum across existing and newly selected line evidence.
- Document photos and label photos remain optional. Photos also remain optional for verification, movement, issue, and other non-receiving actions.
- Validation passed with 13 targeted Inventory service tests and 6 desktop/mobile Receiving Playwright tests, including axe accessibility checks.

## Receiving photo-slot amendment — 2026-08-14

- Packing-slip/document evidence and receipt-line material evidence now use three explicit square upload slots with previews, replacement, and individual removal.
- Document evidence remains optional with a maximum of three photos per receipt. Material evidence remains required with a minimum of one and maximum of three photos per receipt line.
- Local IndexedDB and shared Supabase command paths both preserve all selected evidence; saved receipt document evidence is included when enforcing the three-photo limit.
- Validation passed with 38 unit tests, desktop/mobile Receiving Playwright flows, axe accessibility checks, strict TypeScript, ESLint, and the Next.js 16.3 production build.
