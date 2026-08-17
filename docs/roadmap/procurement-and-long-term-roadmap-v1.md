# Procurement and Long-Term Operations Roadmap v1

- Version: v1
- Planned: 2026-08-17
- Status: Planned
- Current platform: Next.js 16.3 modular monolith, temporary Supabase/Vercel environment

## Confirmed direction

- Preserve every earlier phase plan and decision history. Phase 6 receives a v2 plan for the revised account model.
- Use two user-facing account types: `Operator` and `Tech`.
- Operators have administrative permissions, all current yard operations, Procurement, reports, users, configuration, and all-site access.
- Techs work at installation sites. They do not have Procurement, supplier, cost, purchase-order, Receiving, general Inventory, yard-movement, reporting-export, or administration access.
- An occasional Tech yard pickup is an assigned delivery/handoff task. It does not grant general yard or Inventory access.
- Procurement is Operator-only and replaces the current purchasing process in phases.
- Chrome and Safari are the initial supported browser families.

## Phase 6 v2 — Two-account authorization and closeout

- Preserve Phase 6 v1 and record the completed field acceptance: one Operator account works on desktop/mobile, movements synchronize, media remains private, offline commands replay, and temporary data is documented.
- Replace the visible Operator/Manager/Administrator model with Operator/Tech. Existing Operator, Manager, and Administrator records migrate to Operator.
- Operators receive current administrative and operational permissions. Techs receive only future assigned-project, delivery, pickup, and field-installation access.
- Enforce authorization in Supabase RLS, storage policies, server data access, commands, exports, offline caches, and routes. Hidden navigation is not treated as security.
- Retain one private setup/recovery identity outside the normal account-type interface.
- Until field modules launch, a Tech lands on a restricted My Work empty state.
- Keep Microsoft Entra ID and production SMTP deferred for the temporary demonstration environment.

## Phase 11 — Procurement foundation

- Activate `/procurement` for Operators only.
- Add a Supplier Directory with contacts, ordering instructions, payment terms, active status, and notes.
- Add Purchase Requests and Purchase Request Lines linked to existing project and site identifiers.
- Track description, package/unit type, positive quantity, required-by date, unit cost, freight, tax, discount, and derived total using exact monetary values.
- Support Draft, Submitted, Approved, Rejected, and Cancelled request states.
- Allow self-approval while recording creation and approval as separate immutable events.
- Provide full desktop/mobile workflows. Reference data and drafts may work offline; submission and approval require a live connection.
- Add validated supplier and open-request spreadsheet import with dry-run results.

## Phase 12 — Purchase orders and supplier communication

- Convert approved requests into Purchase Orders and immutable Purchase Order revisions.
- Assign atomic sequential TBS PO numbers and preserve supplier confirmations as separate external references.
- Support Draft, Issued, Acknowledged, Partially Received, Received, Closed, and Cancelled states.
- Generate a private printable TBS PO PDF from each immutable revision.
- Record sent date, method, sender, supplier acknowledgement, expected delivery date, and confirmation reference. Operators send the document outside the app initially.
- Require online access for approval, number assignment, issuance, cancellation, and cost changes.

## Phase 13 — Procurement and Receiving integration

- Let an Operator select an open PO while Receiving and match Receipt Lines to Purchase Order Lines.
- Show ordered and remaining quantities, support partial receipts, and preserve outstanding quantities.
- Preserve the actual receipt when material is short, over, wrong, or damaged; automatically create a linked Issue instead of blocking or rewriting evidence.
- Completing Receiving atomically creates the existing Material Lots, photos, verification/activity history, storage assignments, and PO matches.
- Continue supporting unknown and non-PO shipments.
- Require one to three material photos for Receiving. Require photo evidence for damage Issues. Other operational photos remain optional.
- Tech accounts do not perform Receiving or receive Procurement match context.

## Phase 14 — Migration, reporting, and cutover

- Import open suppliers, requests, purchase orders, and lines from CSV/XLSX using field mapping, dry-run validation, duplicate detection, row errors, checksums, and idempotent reruns.
- Keep the prior system as the historical archive unless a later version explicitly approves historical migration.
- Add permission-aware Procurement reports for commitments, expected deliveries, acknowledgements, partial receipts, supplier activity, and discrepancies.
- Extend the existing reporting read models rather than building a separate reporting store.
- Pilot real request-to-receipt workflows, reconcile record/media/cost parity, then cut over with a documented rollback path.

## Phase 15 — Operations Project Hub

- Activate a cross-operational project workspace without duplicating current project identifiers.
- Add delivery destinations, project contacts, job status, and Tech assignments.
- Operators manage every project; Techs see only explicitly assigned projects.
- Procurement costs and supplier details remain inaccessible to Techs.

## Phase 16 — Deliveries and material pickup

- Convert ready Outbound batches into delivery or pickup tasks with destination, schedule, manifest, handling requirements, and status.
- Show Techs only assigned delivery or authorized pickup details.
- For yard pickup, an Operator prepares and authorizes the outbound batch; the Tech confirms the handoff and cannot substitute other yard material.
- Pickup/delivery photos are optional unless damage is recorded, in which case an Issue and photo are required.

## Phase 17 — Field installation

- Add a Tech-focused My Work surface for assigned project materials and installation work.
- Track Not Started, In Progress, Blocked, and Completed installation states.
- Support installation notes and linked material Issues.
- Keep installation photos optional unless a later policy requires installation evidence.
- Never expose unrelated projects, yard inventory, Procurement, supplier, or cost data to Techs.

## Existing gated and stabilization work

- Repair and field-accept the Phase 10 Reports experience before Procurement implementation.
- Phase 8 QR Labels remains gated by printer, stock, durability, and placement requirements.
- Phase 9 Yard Map remains gated by a confirmed diagram. Its next version must model eight Lavon Conex containers, replacing the older seven-container assumption.
- Extend reports with each new operational phase so reporting does not become a later rewrite.

## Shared architecture and acceptance contract

- Procurement owns suppliers, requests, purchase orders, costs, approvals, and supplier documents.
- Inventory owns physical receipts, Material Lots, locations, condition, and verification.
- Delivery owns yard-to-job transport, manifests, pickup, and handoff.
- Project/Field Operations owns assignments and installation work.
- Every mutation is authorized, validated, idempotent where applicable, and append-only in audit history.
- Preserve current design tokens, components, density, responsive patterns, terminology, and working routes.
- Validate strict TypeScript, lint, unit tests, production build, Chromium/WebKit Playwright flows, axe checks, and real-device Safari/Chrome acceptance.
- Next.js supports Safari 16.4+ and Chrome 111+; TBS acceptance targets the current and immediately previous stable major release of each browser family.

