# Phase 10 Implementation Plan v1

> **Historical implementation plan.** Current user-facing access uses Operator and Tech; role and site language below is retained as decision history.

- Prepared: 2026-08-14
- Status: Implemented; TBS field acceptance pending
- Source plan: [v1.md](v1.md)

## Repository audit

- `/reports` is an active shell route but still renders the shared placeholder.
- Inventory is a normalized schema-v5 lot ledger. The browser receives one RLS-filtered `InventorySnapshot` through the existing Inventory repository and TanStack Query boundary.
- The temporary Supabase database currently contains one Site, 36 Material Lots, no Receipts, no Issues, no Outbound Batches, and 54 Activity Events. Empty reporting states are therefore required and are not treated as zero activity.
- Lavon Yard remains the only active Site. Phase 8 is gated and Phase 9 has not encoded a confirmed map; neither blocks Phase 10.
- The temporary human account inventory is intentionally one Operator plus the bootstrap Administrator used only for setup. Manager and additional Administrator acceptance remains automated/deferred.
- Material Lots do not currently retain a Receipt Line foreign key, and protection/location changes do not retain an exposure-start timestamp. Reporting must not invent receipt-derived age or outdoor-exposure duration from those missing facts.

## Architecture and reusable patterns

- Keep the Operations shell and `/reports` route in the Server Component tree.
- Reuse the existing Inventory provider and its Supabase/local adapters so report formulas receive the same permission-filtered operational records as Inventory workflows.
- Add one deep reporting module whose interface accepts an `InventorySnapshot`, UTC date filters, and an explicit clock. It returns versioned, typed read models for every report category.
- Keep report formulas pure and test them with fixed fixtures. UI code does not calculate business metrics.
- Generate CSV from the same filtered read-model rows rendered on screen. Unknown quantities and unavailable durations export as `Unknown`, never `0`.
- Add Postgres `security_invoker` views for future direct reporting queries and only the source indexes justified by current report filters. No materialized views are introduced.

## Implemented report categories

1. Verification worklist: last confirmation, 14-day due date, due/overdue state, and project/lot drill-through.
2. Material age and exposure: on-site age from the authoritative Material Lot creation timestamp, current protection/location exposure state, and an explicit `Unknown` duration where exposure history is unavailable.
3. Storage contents: present lot counts, known package totals, and unknown-quantity lot counts by location.
4. Receiving history: completed receipts, identity/inspection state, line counts, known packages, and unknown lines.
5. Issue operations: active/completed state, priority, age, assignment, blocking state, and Issue detail links.
6. Project readiness: present lots, verification work, blocking Issues, and derived readiness separate from project status.
7. Outbound history: batch state, selected lot count, known/unknown quantity, operator, and departure evidence time.
8. Operational activity: append-only Inventory activity with operator, UTC timestamp, and source drill-through.

## UI and interaction plan

- Replace the placeholder with a compact Operations Intelligence workspace that uses the existing TBS cards, typography, tokens, orange internal-divider accent, dense desktop tables, and mobile stacked cards.
- Provide report-category navigation plus Site, Project, Location, UTC date-range, and text filters.
- Every result exposes the underlying project, lot workspace, issue, receiving workflow, outbound workflow, or activity source available in the current route model.
- Make table headings sortable on desktop; apply the same order to mobile cards.
- Provide accessible result summaries, deterministic empty states, loading feedback, keyboard focus, and CSV export.
- Do not add capacity percentages, speculative trends, predictive recommendations, or charts unsupported by real historical volume.

## Temporary-role deviation

- The v1 roadmap reserves CSV and full audit views for Manager/Administrator roles. For the temporary demo, filtered operational CSV is enabled for the active Operator so desktop-to-mobile testing can be completed with the single intended human account.
- Database audit records remain protected by the existing Manager/Administrator RLS policy. The Operator-facing Activity report uses the already authorized append-only Activity Events and does not expose privileged before/after audit payloads.

## Migration and rollback

- Reporting database objects are additive `security_invoker` views and indexes; no source records are mutated.
- Rollback drops only the Phase 10 views/indexes and restores `/reports` to the placeholder. Inventory workflows and operational history remain unchanged.
- The Supabase CLI `migration new` command was attempted first as required, but CLI 2.113.0 returned `LegacyMigrationNewWriteError` because the OneDrive-backed migrations directory already exists. The migration file is created with the established timestamp fallback and verified against the connected project.

## Verification contract

- Fixed-fixture unit tests cover the exact 14-day boundary, unknown quantities, no-verification records, exposure-duration gaps, UTC date filters, CSV parity, and empty categories.
- Desktop Chrome and Pixel 7 Playwright flows cover filters, categories, sort, drill-through, CSV availability, mobile cards, and axe accessibility.
- ESLint, strict TypeScript, unit tests, Next.js 16.3 production build, Supabase advisors, view privilege checks, RLS isolation, and representative query plans must pass before Phase 10 is reported complete.

## User acceptance data needed

- Complete at least two Receipts on different UTC dates, including one line with an unknown quantity if that scenario is operationally valid.
- Confirm at least one Material Lot and leave at least one older lot unconfirmed so the verification worklist shows both states.
- Record one active blocking Issue and one resolved non-blocking Issue.
- Complete one Outbound Batch and retain one planned or ready batch.
- Confirm whether TBS wants a future `exposure_started_at` history event and explicit Receipt-to-Lot lineage; until then those fields remain visibly unknown rather than inferred.
- Provide production-like row-count targets after the demo dataset is representative so query-performance acceptance thresholds can be finalized.

Phase 8 remains gated. Phase 9 is not started by this implementation.
