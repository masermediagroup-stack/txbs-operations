# Phase 4 Implementation Plan v1

- Status: Implemented
- Repository audit: 2026-08-07
- Authoritative scope: `v1.md`, resolved against the current Phase 3 repository

## Objective and field workflow

Phase 4 will let a yard operator review a project's current lots, reserve full or partial quantities in an outbound batch, confirm the selected material is ready, record departure, and retain an exact ledger of departed and remaining material. Incorrect departures are corrected with compensating reversal records rather than edits or deletion.

The implemented workflow will be:

1. Open Outbound directly or from a project readiness panel.
2. Select one project and one or more present lots, choosing a full or partial quantity.
3. Review verification, blocking issues, location, condition, access, and handling requirements.
4. Enter the required operator name and create a Planned batch.
5. Mark the batch Ready after the selected lots are verified and the project has no unresolved blocking issue.
6. Record departure with a required operator, optional carrier/driver references, optional note, and optional proof photo.
7. Review remaining and departed quantities, or create an explicit reversal when the departure was recorded incorrectly.

## Current repository audit

- Preserve the Next.js 16 App Router modular monolith and the single Inventory client/query boundary.
- Preserve the versioned IndexedDB snapshot plus image-blob stores, optimistic revision check, portable backup archive, and in-memory test adapter.
- Extend the existing `createInventoryService` transaction seam; do not add a generic repository or a second transaction owner.
- Reuse Material Lot versioning, presence, position, handling, project/site ownership, and Phase 3 parent/root lineage.
- Reuse `PageHeader`, Card, Alert, Badge, Field, Native Select, Sheet, desktop table, mobile card, camera input, and sticky-action patterns.
- Add Outbound after Movements in Inventory navigation while retaining every existing item's relative order.
- Keep `/deliveries` outside Inventory with its current cross-operational placeholder meaning.
- No recent commit audit is possible because Git metadata/tooling is not available in this workspace.

## Domain and data changes

- Advance the Inventory schema from version 3 to version 4.
- Add `OutboundBatch` with project/site ownership, Planned/Ready/Departed/Cancelled/Reversed state, operator history, timestamps, optional carrier/driver references, optional evidence, idempotency key, and optional reversal link.
- Add `OutboundLine` with source and resulting lot IDs, reserved/departed quantity, source lot version, source location/position snapshot, package/material/handling snapshot, and resulting lot version.
- Add outbound links to typed photo evidence and outbound entity/activity types.
- Treat Planned and Ready lines as reservations. A lot cannot be reserved twice or moved while it has an active outbound reservation.
- Unknown-quantity lots can only be reserved and departed in full.
- A full departure marks the existing lot Removed. A partial departure reduces the source and creates a Removed child lot with the existing parent/root lineage rules.
- Reversal requires every departed result lot to remain unchanged. It restores presence at the recorded source without merging split lineage.
- Derive project readiness independently from project operational status. Readiness is blocked by no present material, verification due on any present lot, or an unresolved blocking issue.

## Service interface

Extend the existing Inventory module with narrow use cases:

- `createOutboundBatch`
- `markOutboundReady`
- `departOutboundBatch`
- `cancelOutboundBatch`
- `reverseOutboundBatch`

Every mutation requires an operator name, uses a client mutation ID, commits atomically, increments the snapshot revision, and appends Activity history. Lifecycle validation and quantity splitting remain inside the module so UI callers do not reproduce invariants.

## UI and responsive behavior

- Add `/inventory/outbound` with preparation, active queue, and departure history.
- Add a project readiness panel and **Prepare outbound** action to project workspaces.
- Desktop uses a dense lot table, project filters, selected/remaining quantities, and side-by-side batch review.
- Mobile uses stacked lot cards, 44px-or-larger primary controls, full-width quantity fields, full-height action sheets, camera-first optional evidence, and sticky plan/depart controls.
- The visual system stays within current semantic tokens: TBS blue for primary actions, orange only for operational emphasis, graphite/neutral surfaces for hierarchy, Geist for interface text, and the existing monospace treatment for quantities.
- The signature interaction is a compact source-to-departure ledger that keeps location, selected quantity, remaining quantity, and handling restrictions readable in one scan; it is operational structure, not decoration.

## Intentional deviations and clarifications

- The phase plan's separate outbound “ports” are implemented as methods on the established Inventory service/persistence seam. A second outbound repository would duplicate atomic ownership and conflict with the architecture proven in Phases 1.3–3.
- Proof photos are optional for outbound readiness, departure, cancellation, and reversal. The current product rule requires photos only when Receiving material.
- Ready validates the selected lots' verification state. Project readiness summarizes all present lots, but a batch does not require unrelated project lots to be selected.
- Reversal creates a new Reversed batch linked to the original Departed batch; the original evidence remains Departed and immutable.

## Migration and rollback

- Version 1–3 snapshots migrate to schema 4 with empty outbound collections and nullable outbound photo links.
- Backup export/import automatically includes outbound records and their photo blobs through the normalized snapshot archive.
- Failed reservation, readiness, departure, cancellation, or reversal commits nothing.
- Rollback requires a pre-phase portable backup. Completed outbound records are corrected through reversal, never deletion.

## Verification and acceptance

- Unit tests: schema migration; readiness reasons; full, partial, multi-lot reservation/departure; unknown quantity; duplicate reservation; stale version; movement lock; cancellation; optional photos; reversal; quantity parity; immutable history.
- E2E: project entry, plan, ready, depart, remaining quantity, history, mobile interaction, and axe accessibility.
- Quality gates: targeted and full ESLint, strict TypeScript, all Vitest tests, production build, desktop/mobile Playwright, and WCAG 2 A/AA plus 2.1 A/AA axe checks.
- Final report will document behavior, domain/routes/migrations, deviations, responsive/accessibility evidence, validation results, risks, rollback, and confirmation that Phase 5 was not started.
