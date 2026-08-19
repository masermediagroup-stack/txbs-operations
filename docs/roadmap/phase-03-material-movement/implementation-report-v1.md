# Phase 3 Implementation Report v1

> **Historical implementation report.** References to future manager-level work predate the current Operator/Tech access model.

- Completed: 2026-08-06
- Status: Implemented

## Implemented behavior

- Activated `/inventory/movements` for full, partial, and multi-lot movement with one confirmed destination.
- Added project, material, and storage entry through the shared lot ledger's **Move material** action.
- Added active-lot search plus project and current-location filters, editable quantities, exact/general/unknown destination positions, required reasons and operator names, optional notes, and up to three optional proof photos.
- Handling requirements are consolidated and displayed before confirmation.
- Full moves update the existing lot. Partial moves split a child lot with parent/root lineage while leaving the remainder at its source.
- Every movement atomically records a header, independent lines, source/destination evidence, resulting lot versions, up to three optional photos, and append-only activity.
- Reversals create new movement and activity records. They stop if resulting material changed after the original movement and never delete or merge history.
- Desktop uses a dense selection table. Mobile uses ten-at-a-time cards, 44px destination controls, camera capture, and a sticky confirmation action.

## Routes and domain changes

- Added canonical `/inventory/movements` and a Movements Inventory navigation entry.
- Changed `/inventory/material-movements` from its former Activity redirect to a permanent redirect to `/inventory/movements`.
- Added `MaterialMovement`, `MovementLine`, movement kinds, movement-linked photos, movement activity types, `rootLotId`, and client mutation IDs.
- Updated the domain glossary and added ADR 0007 for immutable movement and split-lot lineage.

## Persistence, migration, and rollback

- Advanced the inventory and IndexedDB schema from version 2 to version 3.
- Phase 1 and Phase 2 snapshots migrate forward by assigning every existing lot to its own lineage root, adding nullable movement photo links, and initializing empty movement collections.
- The existing atomic Inventory persistence seam remains authoritative; no redundant movement repository was added.
- Failed validation, stale versions, invalid quantities, same-position moves, and cross-site attempts commit no movement or lot change.
- Local backup export/import includes schema 3 movement records and continues checksum validation for photos.
- Rollback uses a pre-phase portable backup. Completed movements are corrected with reversals rather than destructive edits.

## Intentional implementation decisions

- The current Inventory service and atomic snapshot persistence were extended instead of adding a second repository seam. This preserves the architecture established in Phases 1.3 and 2 and keeps transaction behavior testable through one narrow interface.
- Unknown-quantity lots may only move in full; Movement Line quantity remains explicitly unknown rather than becoming zero.
- A reversed partial child remains a distinct child at the source instead of being merged back into its parent, preserving lineage and evidence.
- Inter-site transfer remains rejected because no later-phase logistics workflow has authorized it.

## Validation

- ESLint: passed, with generated stale Next.js build directories excluded from source linting.
- Strict TypeScript: passed.
- Unit tests: 19 passed, including schema migration, full/partial/batch movement, stale and invalid rejection, quantity invariance, lineage, and reversal.
- Next.js 16.2.12 Turbopack production build: passed; all 76 static/dynamic pages generated.
- Desktop/mobile Playwright: 18 passed serially across movement, receiving, navigation, search, responsive shell, and legacy redirect flows.
- Axe: no WCAG 2 A/AA or WCAG 2.1 A/AA violations in the movement acceptance view at desktop and Pixel 7 viewports.

## Known limits and risks

- Movement records are device-local until Phase 6 shared infrastructure; no cross-device synchronization is implied.
- QR scanning, inter-site transfers, forklift automation, vehicle assignment, route scheduling, and outbound completion remain excluded.
- Reversal intentionally requires unchanged resulting lots. More complex correction workflows remain manager-level future work.

Phase 4 was not started.
