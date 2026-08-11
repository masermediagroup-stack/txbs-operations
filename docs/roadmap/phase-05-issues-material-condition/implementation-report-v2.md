# Phase 5 Implementation Report v2

- Completed: 2026-08-10
- Status: Implemented
- Source plan: [Phase 5 v2](v2.md)

## Implemented behavior

- Replaced the minimal Issue worklist with a durable, filterable operations worklist covering active/closed state, type, priority, project, assignee, age, evidence state, and search. Filter choices are retained in the URL.
- Added addressable `/inventory/issues/[id]` workspaces with evidence, linked operational records, assignment, append-only follow-up, immutable transition history, and lifecycle actions.
- Added Open, In Progress, Resolved, and Dismissed lifecycle rules. Resolved and Dismissed Issues may only reopen to Open through a documented transition.
- Added assignment/unassignment by name, acting-operator attribution, required status-change notes, resolution notes, comments, and optional comment photos.
- Added `Record Issue` entry points to project, material lot, storage location, completed receipt, movement history, and outbound batch surfaces.
- Added links from Issue detail back to affected projects, materials, receipts, storage locations, movements, and outbound records.
- Enforced the product evidence rule: Receiving still requires one material photo per receipt line; a newly recorded Damaged Issue also requires a valid image; every other non-receiving action keeps photos optional.
- Reused the required Receiving material photo for automatic Damaged Issues without creating another photo record or blob.
- Preserved Unknown Shipment evidence while allowing resolution to associate its Receipt with a confirmed Project.
- Open and In Progress blocking Issues prevent Project Readiness. Resolved and Dismissed Issues remain visible but no longer block readiness.
- Preserved supplier-return coordination as comments and lifecycle history. Vendor claims, return authorization, and shipping management were not introduced.

## Routes, UI, and responsive behavior

- Preserved `/inventory/issues` in its established Inventory navigation position.
- Added dynamic `/inventory/issues/[id]` and a stable `Issue detail` breadcrumb.
- Desktop uses the established compact table, dense metadata, and two-column Issue workspace.
- Mobile uses stacked worklist cards, full-width controls, camera capture, full-height creation sheets, and the same complete lifecycle workflow as desktop.
- Applied the TBS orange accent only to internal dividers beneath card titles/descriptions. The legacy Movement card's outer-left accent was corrected to the same rule.
- Reused current shadcn/Base UI Cards, Fields, native selects, Alerts, Badges, Empty states, Sheets, buttons, tables, semantic tokens, radii, and typography.

## Domain and transactional changes

- Added `In Progress` and immutable `IssueTransition` records for Created, Assigned, Linked, and Status changed events.
- Added append-only `IssueComment` records with operator name, future nullable user ID, text, timestamp, and optional evidence.
- Expanded Issue links to project, lot, receipt, location, movement, and outbound batch.
- Added Issue photo IDs, resolution note, and retry-safe idempotency key.
- Added `issueId` to Photo Record while preserving its original receiving/lot/location links.
- Added narrow `recordIssue`, `assignIssue`, `addIssueComment`, and `transitionIssue` use cases to the established Inventory transaction service.
- Every successful mutation creates append-only Issue history and a global Activity Event. Failed validation commits neither snapshot changes nor blobs.
- Updated the domain glossary and accepted [ADR 0009](../../adr/0009-preserve-issue-evidence-and-lifecycle.md).

## Persistence, migration, and rollback

- Advanced Inventory schema and IndexedDB database versions from 4 to 5.
- Schema 1–4 snapshots migrate directly to version 5 with nullable links, empty comment history, normalized photo links, and one Created transition for each legacy Issue.
- Legacy Damaged Issues reuse matching Receiving evidence where available. Records without real images remain readable as `Needs evidence`; migration never invents a photo.
- The existing portable checksum archive now round-trips Issue records, comments, transitions, photo metadata, and image blobs.
- Rollback requires a pre-phase portable backup. Issue activity is append-only and is not destructively rewritten.

## Intentional deviations

- `/inventory/issues` was already repository-backed, so it was evolved rather than replaced as hard-coded UI.
- Current `Urgent` priority terminology was preserved rather than restoring the older `Critical` wording.
- Issue commands were added to the established Inventory service boundary instead of creating a second repository and transaction owner.
- Issue detail uses a shared route on desktop and mobile instead of a desktop-only side panel.
- Receiving damage evidence is linked, not copied, to prevent duplicate local media.

## Validation evidence

- Full ESLint: passed with no warnings.
- Strict TypeScript: passed.
- Unit/domain tests: 31 passed. Coverage includes schema 4 migration, every Issue type, damaged-photo enforcement, idempotency, automatic Receiving evidence reuse, assignment, comments, lifecycle/reopen, Unknown Shipment resolution, readiness, blob access, and backup round-trip.
- Next.js 16.2.12 Turbopack production build: passed; all 77 static/dynamic pages generated, including `/inventory/issues/[id]`.
- Desktop/mobile Playwright: 30 passed across Issues, Receiving, Movement, Outbound, shell, navigation, search, and redirects.
- Axe: no WCAG A/AA or WCAG 2.1 A/AA violations on Issue worklist and full Issue lifecycle at desktop and Pixel 7 viewports.
- Live browser: `/inventory/issues` loaded with meaningful content, working creation Sheet, no error overlay, no new server/browser warnings, and the current compact TBS visual hierarchy.
- Test infrastructure was aligned to `http://localhost:3000`; Next.js 16 had blocked the prior `127.0.0.1` development origin before hydration.

## Known limits and risks

- Issue records and media remain local to one browser/device until Phase 6 shared infrastructure.
- Pre-authentication operator and assignee names are free text and intentionally preserved for later user-ID association.
- Legacy Damaged Issues without real evidence cannot be resolved or dismissed until an operator adds a photo.
- Supplier returns remain operational follow-up only; vendor directories, claims, authorization numbers, and return shipping remain out of scope.

Phase 6 was not started.
