# Phase 4 Implementation Report v1

> **Historical implementation report.** References to future manager-level work predate the current Operator/Tech access model.

- Completed: 2026-08-07
- Status: Implemented

## Implemented behavior

- Activated `/inventory/outbound` with project selection, full/partial lot quantities, reservation, readiness confirmation, departure, cancellation, reversal, active queue, and immutable history.
- Added a Project Readiness panel and **Prepare outbound** action to every Inventory project workspace.
- Project Readiness is derived separately from project operational status using present material, 14-day verification, and unresolved blocking Issues.
- Planned and Ready batches reserve their selected lots. A reserved lot cannot enter another active outbound batch or Material Movement.
- Ready requires every selected lot to be verified and the project to have no unresolved blocking Issue.
- Departure records a required operator, optional carrier/driver references, optional note, and optional proof photo. The product rule that only Receiving requires photos is preserved.
- Full departure marks the existing lot Removed. Partial departure reduces the source and creates a Removed child with parent/root lineage.
- Cancellation releases reservations without removing planning history.
- Reversal creates a linked Reversed batch, restores only unchanged departed lots, and preserves the original batch as Departed.
- Desktop uses a dense selection and source/remaining ledger. Mobile uses stacked lot cards, full-width controls, camera capture, full-height action sheets, and sticky planning/departure actions.

## Reused and introduced patterns

- Extended the established Inventory service and atomic snapshot persistence seam instead of adding a second repository.
- Reused Phase 3 lot versioning, stale-write protection, split-lot lineage, idempotency, optional evidence, and compensating reversal model.
- Reused the current Card, Alert, Badge, Field, Native Select, Sheet, button, table, mobile card, and semantic TBS token patterns.
- Added a source-to-departure ledger that keeps selected and remaining quantities visible with location and handling snapshots.

## Routes, domain, and navigation

- Added canonical route `/inventory/outbound`.
- Added Outbound after Movements in Inventory navigation while preserving all prior items' relative order.
- Added `OutboundBatch`, `OutboundLine`, Planned/Ready/Departed/Cancelled/Reversed states, outbound photo links, outbound activity types, and outbound entity history.
- Added readiness, active reservation, and reserved-quantity selectors.
- Updated the domain glossary and accepted ADR 0008 for immutable departure and compensating reversal evidence.
- `/deliveries` remains outside Inventory as the unchanged future cross-operational placeholder.

## Persistence, migration, and rollback

- Advanced the Inventory and IndexedDB schema from version 3 to version 4.
- Phase 1–3 snapshots migrate forward with nullable outbound photo links and empty outbound batch/line collections.
- Portable backup export/import includes schema 4 outbound records and any optional outbound photo blobs through the existing checksum archive.
- Failed planning, readiness, departure, cancellation, and reversal validation commits no snapshot or media changes.
- Rollback uses a pre-phase portable backup. Completed departures are corrected through reversal rather than destructive edits.

## Intentional deviations

- The planned separate outbound ports were implemented as narrow methods on the established Inventory service interface. This retains one transaction owner and prevents duplicated persistence seams.
- Project Readiness summarizes every present project lot, while Ready validates the selected batch lots plus project blocking Issues. This allows controlled partial outbound work without claiming that unrelated lots are departing.
- Lifecycle idempotency keys are stored on each Outbound Batch as processed mutation IDs because one batch receives several commands after planning.
- Reversal is represented by a new Reversed batch linked to an unchanged Departed batch rather than changing the original batch to Reversed.

## Validation

- Full ESLint: passed.
- Strict TypeScript: passed.
- Unit tests: 24 passed, including schema migration, readiness, reservation conflict, movement lock, full/partial departure, optional photo behavior, cancellation, quantity parity, lineage, and reversal.
- Next.js 16.2.12 Turbopack production build: passed; all 77 static/dynamic pages generated.
- Desktop/mobile Playwright: 26 passed serially across Receiving, Movement, Outbound, navigation, responsive shell, search, and redirects.
- Axe: no WCAG 2 A/AA or WCAG 2.1 A/AA violations on the Outbound workspace at desktop and Pixel 7 viewports.
- Visual checks: desktop 1440×900 and mobile 390×844 rendered without console errors and preserved the existing compact TBS hierarchy.

## Known limits and risks

- Outbound records remain device-local until Phase 6 shared infrastructure.
- Ready reservations are intentionally conservative: any later lot version change requires another review before departure.
- Automatic reversal refuses changed departed lots; a richer manager correction workflow is not introduced before authorization.
- Delivery scheduling, route planning, fleet assets, installation, and proof of installation remain out of scope.

Phase 5 was not started.
