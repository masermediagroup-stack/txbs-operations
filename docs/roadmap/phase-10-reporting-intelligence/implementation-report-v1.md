# Phase 10 Implementation Report v1

> **Historical implementation report.** Current user-facing access uses Operator and Tech; legacy role and site wording below describes the state at delivery.

- Report date: 2026-08-14
- Source plan: [Phase 10 v1](v1.md)
- Implementation plan: [implementation-plan-v1.md](implementation-plan-v1.md)
- Status: Implemented; TBS field acceptance pending

## Implemented behavior

- Activated `/reports` as a permission-aware Operations Intelligence workspace backed by the same authorized Inventory snapshot used by current workflows.
- Added Verification, Age and Exposure, Storage, Receiving, Issues, Readiness, Outbound, and Activity report categories.
- Added Site, Project, Location, UTC date-range, and text filters. Desktop report tables are sortable; mobile uses linked operational cards.
- Added source drill-through to existing project, material, storage, issue, receiving, outbound, and activity routes.
- Added CSV export from the exact filtered and sorted rows shown on screen. Unknown facts export as `Unknown`, not zero.
- Added summary counts for present lots, verification actions, active Issues, and ready projects.
- Kept capacity utilization, trend charts, predictions, and benchmarks out because the current records cannot support them honestly.

## Formula and data decisions

- Verification due dates use the latest confirmation plus 14 days. Never-verified lots remain separately identified.
- Material age is explicitly labeled recorded age and uses the Material Lot creation timestamp. It is not presented as receipt age because no durable Receipt Line-to-Lot relationship exists yet.
- The current indoor/outdoor protection state is reportable, but exposure duration remains `Unknown` until an exposure-start event is recorded.
- Readiness remains derived from present lots, verification work, and unresolved blocking Issues; it does not replace Project operational status.
- All Phase 10 formulas are versioned as `phase-10-v1` and tested with an explicit clock and UTC boundaries.

## Routes, domain, and database changes

- Activated route: `/reports`.
- Added a feature-owned reporting module with typed read models and pure formula/CSV functions.
- Added five additive Supabase `security_invoker` views for present-lot/verification, completed Receiving, Issues, Outbound, and Activity reporting.
- Added partial/indexed access paths for present Material Lots, completed Receipts, and Issue creation history.
- Views grant read access only to authenticated users. Source-table RLS continues to restrict rows to assigned Sites, and anonymous access is denied.

## Temporary demo deviation

- The single Operator demo account can export its authorized operational report rows so desktop-to-mobile testing does not require creating Manager or additional Administrator accounts.
- Privileged `audit_records` remain Manager/Administrator-only. The Operator Activity report exposes authorized operational Activity Events, not privileged before/after payloads.

## Migration and rollback

- Applied migration `20260814210000_phase_10_reporting_read_models.sql` to the temporary Supabase project.
- The migration is additive and changes no operational records.
- Rollback drops only the five report views and three report indexes, then restores `/reports` to its prior placeholder. Inventory data and workflows remain intact.

## Validation evidence

- ESLint: passed.
- Strict TypeScript: passed.
- Vitest: 5 files and 43 tests passed, including fixed report formulas, unknown handling, UTC filtering, and CSV parity.
- Next.js 16.3 production build with Turbopack: passed.
- Full Playwright production suite: 42/42 passed across Desktop Chrome and Pixel 7. Phase 10 coverage includes filtering, category navigation, source drill-through, CSV download, and axe WCAG 2/2.1 A/AA checks.
- Supabase view checks: all five views use `security_invoker=true`; only `authenticated` has `SELECT`; anonymous access is denied.
- Representative material-report query: the Phase 10 partial index was selected, with approximately 0.44 ms execution on the current 36-lot dataset.

## Known risks and field acceptance

- The live temporary database currently has 36 present Material Lots and 54 Activity Events but no completed Receipts, Issues, or Outbound Batches. Those reports intentionally show empty states until real demo workflows create records.
- Production-volume performance targets cannot be finalized from a 36-lot test dataset.
- Receipt-derived material age and outdoor exposure duration require future source events/relationships; the UI does not infer them.
- Supabase still reports the known temporary-auth warnings for the intentionally callable command/setup functions and disabled leaked-password protection. No new Phase 10 security-policy warning was introduced.

## Phase boundary

Phase 8 remains gated by physical label hardware. Phase 9 Yard Map was not started. Phase 10 does not invent map geometry, capacity, or historical facts.
