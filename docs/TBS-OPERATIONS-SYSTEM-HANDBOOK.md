# TBS Operations — System and Team Handbook

- Document purpose: Explain what TBS Operations is, how it works today, how a team should operate it, and how the product will expand.
- Audience: TBS leadership, Operators, Techs, implementation partners, and future maintainers.
- Current planning baseline: August 19, 2026
- Source of truth: The current repository and database migrations take priority over older phase documents.

## 1. Executive summary

TBS Operations is a responsive operations web application for tracking project material from arrival at a TBS inventory site through storage, verification, movement, issue handling, outbound preparation, and departure. It is designed for desktop and mobile use and preserves an auditable history of who did what, when, where, and to which material.

The system replaces informal material knowledge—memory, handwritten notes, isolated photos, and disconnected spreadsheets—with shared operational records. A team member can search for a project or material, find its recorded storage location, see whether it needs verification, review its history and evidence, and perform the next authorized action.

The current application is a temporary production-like demonstration environment built with Next.js, Supabase, and Vercel. It is intended to validate the complete product and team workflow before company-approved authentication, database, storage, and infrastructure are selected for long-term production.

## 2. What the system offers today

The implemented product currently provides:

- Project and material search across official names, aliases, field labels, purchase-order references, job numbers, material descriptions, and storage locations.
- Site-aware project inventory and Material Lots.
- Eight numbered Conex containers at Lavon Yard, plus confirmed yard storage areas.
- Richardson Office & Warehouse as a second Site, with a small indoor warehouse and receiving area.
- Exact, general, and unknown storage-position recording.
- Receiving workflows with required photographic evidence.
- Full, partial, and multi-lot material movements with lineage and reversal history.
- Project readiness and outbound material workflows.
- Material-condition and operational Issues with comments, assignment, status history, and damage evidence.
- Private photo storage and authenticated media access.
- Shared Supabase data across desktop and mobile devices.
- Offline mobile command queuing and later synchronization.
- Operational reports, filters, drill-through records, and CSV exports.
- Account administration using Operator and Tech account types.
- Operator-assigned field work with Tech installation confirmation, optional evidence, and linked field Issues.
- Append-only activity and audit records.
- Responsive desktop tables and mobile cards, sheets, camera/library upload controls, and large touch targets.

## 3. Account types and responsibilities

### Operator

Operator is the broad trusted-business account type. It is an access scope, not a yard job title, physical-work location, or rank. An Operator may be an office employee, company president, warehouse/material manager, yard team member, or another person who needs the complete operational picture. Operators can use all active operational workflows and administer other accounts.

An Operator can:

- View and search all current operational sites.
- Receive material.
- Add and verify Material Lots.
- Move material and reverse eligible movements.
- Prepare, approve, depart, cancel, and reverse outbound material as permitted by workflow state.
- Record, assign, discuss, resolve, dismiss, and reopen Issues.
- View reports and export authorized data.
- Activate or deactivate accounts.
- Assign an account as Operator or Tech.
- Manage future site, configuration, Procurement, and operational administration features as they launch.

Operators should not share credentials. Actions preserve both the authenticated account and the operator name stored with the operational event.

### Tech

A Tech is a focused field-installation account type. Techs normally work at customer/project sites, not at TBS inventory sites. Material is generally delivered to them, although an Operator may occasionally authorize a specific yard pickup. This narrower access is based on workflow need and information sensitivity; it does not represent an organizational hierarchy.

Tech accounts use My Work to see and act on only the field context they need:

- Material currently stored across TBS inventory Sites.
- The project, TBS material name, quantity, Site, and recorded location.
- Planned, Ready, and Departed Outbound handoffs.
- Assigned Work linked to Ready or Departed Outbound batches.
- Installation lines, delivered quantities, handling requirements, due dates, and assignment notes.
- Installation confirmation with Installed, Partially installed, or Blocked outcomes.
- Zero to three optional installation photos and linked field Issues; a Damaged Issue requires a photo.

Tech accounts cannot access or perform:

- Receiving.
- Material Movements.
- Outbound preparation, approval, departure, cancellation, or reversal.
- Reports or exports.
- Procurement, suppliers, purchase orders, or costs.
- Account Administration.
- Configuration or unrestricted operational changes.

Tech inventory search remains global and read-only for pickup and installation context. Assigned Work and installation confirmation are the only operational mutation surfaces available to a Tech. A Tech account never grants Receiving, yard-movement, Procurement, cost, reporting-export, or account authority.

### Retired role names

Manager and Administrator are no longer user-facing account types. Existing legacy records were migrated to Operator. Older database enum labels remain internally only to preserve compatibility with immutable historical migrations; they are not account choices.

## 4. How an account is created and managed

### Creating an account in the temporary environment

1. An authorized setup person creates the email/password identity in Supabase Authentication.
2. Supabase creates the corresponding application Profile.
3. The new account initially remains inactive.
4. An active Operator opens TBS Operations Administration.
5. The Operator sets the display name, selects Operator or Tech, activates the account, and saves it.
6. The new user signs in and receives only the access allowed for that account type.

Public signup remains disabled.

### Deactivating an account

Deactivation is the normal offboarding process. It prevents future application access while preserving the user reference on movements, receipts, photos, activity, and audit records.

### Deleting an account

Auth-user deletion is intentionally blocked while a `public.profiles` record references that user. Operational records may also reference the Profile. This protects audit history.

- If an account has performed operational work, deactivate it instead of deleting it.
- An unused test account may be deleted only after its memberships and Profile are removed through an approved database procedure.
- Recreating the same email later creates a new UUID and a new identity; old history does not automatically reconnect.

## 5. Core operational concepts

### Site

A Site is a distinct TBS operating location that owns its locations and records. Current Sites are Lavon Yard and Richardson Office & Warehouse. Richardson contains the main office, a small indoor warehouse, and a receiving area. Any future larger warehouse remains a separate additional Site.

### Storage Location and Position

A Storage Location is a named place such as Conex 1–8 or a confirmed yard area. A Storage Position adds precision inside that location.

- Exact: A confirmed internal position is known.
- General: The location is known but the exact internal position is not.
- Unknown: The material has not been assigned or its position cannot be confirmed.

Exact location data is recorded only from real field confirmation. The system does not invent coordinates, rows, capacity, or container positions.

### Inventory Project

An Inventory Project groups the material belonging to one job. It may have an official name, aliases, field-label text, job number, and purchase-order references. Project operational status and material readiness are separate concepts.

### Material Group and Material Lot

A Material Group describes a project-specific material category using the common TBS Material Name. A Material Lot is the traceable physical quantity that is actually stored, moved, verified, or removed.

The team often uses a practical common name that differs from a supplier's catalog or invoice wording. The TBS Material Name remains the primary operational and searchable name. Supplier Material Description is supporting reference data and must not overwrite the name staff use in receiving, storage, movement, outbound, or field work. The current model can retain supplier wording in the group description; a dedicated supplier-description field is planned with Procurement integration.

A Material Lot records:

- Project and Site.
- Package type.
- Whole-number quantity or explicitly unknown quantity.
- Storage Location and Position.
- Presence.
- Condition.
- Protection.
- Accessibility.
- Handling requirements.
- Verification history.
- Photo and activity links.
- Parent/root lineage after a partial movement or departure.

Project and material totals are derived from current lots; duplicate aggregate fields are not treated as the source of truth.

### Verification

Verification confirms that a lot is still present at its recorded location. Material becomes `Needs Verification` after 14 days without confirmation. Unknown data is not treated as zero, and an unknown location is not treated as a confirmed location.

### Activity and audit history

Operational mutations create append-only history. Corrections are represented by new reversal or transition events rather than silently rewriting or deleting the original action.

## 6. Daily workflows

### A. Find a project or material

1. Open Inventory Dashboard or global search.
2. Search by project, alias, handwritten field label, PO, job number, material, or storage location.
3. Open the complete result row/card.
4. Review project status, present lots, location, restrictions, verification state, Issues, and activity.
5. Start the appropriate action from that workspace.

Search results explain alias-based matches where relevant.

### B. Receive material

Receiving is the only normal material workflow that always requires material photos.

1. Identify the shipment and enter its receipt reference.
2. Match it to a known project or preserve it as an unknown shipment.
3. Inspect the shipment.
4. Upload or capture packing-slip/document evidence.
5. Add one or more Receipt Lines.
6. For each line, record material, package type, quantity or unknown quantity, and condition.
7. Attach 1–3 material photos to each Receipt Line.
8. Record handwritten project-label text and whether a physical label was applied.
9. Assign staging or storage.
10. Enter the operator name, review, and complete Receiving.

Completion atomically creates the Material Lots, photos, verification/activity records, and storage assignments. If completion fails, partial lots are not created.

Unknown shipments are preserved as real Receipts and create an `Unknown Shipment` Issue. Later resolution links the Receipt to the correct project without erasing the original evidence.

### C. Verify material

1. Open a project, lot, or storage workspace.
2. Select Confirm Still Here.
3. Confirm the location and position precision.
4. Add a note if useful.
5. Add optional photo evidence.
6. Enter the operator name and confirm.

Verification photos are optional. The 14-day clock restarts from the new confirmation time.

### D. Move material

1. Select one or more present Material Lots.
2. Choose a full quantity or a valid partial quantity.
3. Select one destination and its position.
4. Review handling warnings.
5. Enter a reason, optional note, and required operator name.
6. Add 0–3 optional proof photos.
7. Confirm the movement.

A full movement updates the lot location. A partial movement creates a child lot and preserves lineage. Totals remain invariant. The system prevents invalid quantities, same-source/destination moves, stale selections, and movement of removed material.

Movement-history cards show the project, material, quantity, source, destination, time, operator, and reason. Eligible corrections create a reversal rather than deleting the movement.

### E. Prepare and depart outbound material

1. Open Outbound or a project readiness panel.
2. Select present lots and quantities.
3. Create a planned Outbound Batch.
4. Resolve blocking Issues and confirm selected lots as required.
5. Mark the batch Ready.
6. At pickup/departure, confirm final quantities and references.
7. Attach optional proof evidence.
8. Record departure.

Departure atomically updates presence, quantities, project summaries, and history. Partial departures preserve remaining quantity and lot lineage. Corrections are reversal events.

### F. Record and resolve an Issue

Issue types include missing, damaged, wrong project, wrong quantity, unknown shipment, weather exposure, blocked access, and custom exceptions.

1. Record the Issue from the relevant project, lot, Receipt, Movement, location, or Outbound Batch.
2. Classify priority and blocking status.
3. Describe the condition accurately.
4. Attach evidence.
5. Assign by name, discuss through comments, and transition status.
6. Resolve, dismiss, or reopen with a recorded reason.

A Damaged Issue requires at least one linked damage photo before completion. This supports supplier-return and damage-claim workflows, including fragile material such as mirrors. Other Issue photos are optional unless the originating workflow requires them.

### G. Review reports

The Reports workspace provides operational read models rather than decorative dashboards. Available views include:

- Verification due and overdue.
- Material age and exposure.
- Storage contents and package counts.
- Receiving activity.
- Issue trends and aging.
- Project readiness.
- Outbound history.
- Operational activity.

Reports support date, Site, project, and report-specific filters. Metrics distinguish unknown values from zero and link back to their underlying records. Operators can export authorized filtered rows to CSV.

### H. Assign and confirm installation work

1. An Operator opens a Ready or Departed Outbound Batch and assigns it to an active Tech account.
2. The Tech opens My Work and reviews the project, material lines, quantities, handling requirements, due date, and assignment note.
3. The Tech starts the assignment, enters installed quantities, and selects Installed, Partially installed, or Blocked.
4. The Tech adds notes and zero to three optional installation photos.
5. If material is damaged, missing, wrong, or access is blocked, the Tech creates a linked Issue. Damaged Issues require at least one photo.
6. Submission preserves the Tech identity, UTC timestamp, material-line quantities, Activity/Audit evidence, and assignment version.

Field confirmations can queue offline with photo blobs and replay idempotently. A server-version change pauses the command in the conflict inbox rather than overwriting newer work.

## 7. Desktop and mobile behavior

The application is one responsive product, not separate desktop and mobile systems.

### Desktop

- Dense tables and worklists.
- Side panels and review sections.
- Multi-select movement and outbound workflows.
- Keyboard navigation and visible focus states.
- Full-row/card navigation instead of small arrow-only targets.

### Mobile

- Responsive cards and full-height action sheets.
- Large, one-handed controls and sticky primary actions.
- Camera capture and photo-library selection.
- Receiving and Movement workflows available on phone.
- Connection, queued, syncing, and conflict states.
- Installable Progressive Web App behavior.

Initial supported browser families are current and immediately previous stable Chrome and Safari versions. Real-device acceptance remains important because camera, storage, and service-worker behavior differ by platform.

## 8. Offline and synchronization behavior

The mobile companion caches assigned operational reference data in IndexedDB and can queue supported commands when connectivity is unavailable.

Offline-capable command categories include Receiving, Movement, Verification, Issue, field-assignment start, installation confirmation, and their photo metadata as implemented by the command journal.

The synchronization process:

1. Stores the command with a client-generated mutation ID.
2. Stores captured photo blobs locally.
3. Shows a visible queued state.
4. Uploads photos when connectivity returns.
5. Replays commands in order.
6. Uses idempotency IDs to prevent duplicate execution.
7. Pauses conflicting commands when the server record changed.
8. Presents conflicts for human resolution instead of silently overwriting server data.

A visible manual Sync action remains available because background synchronization is not uniformly supported by browsers. Users should not clear browser storage while actions remain queued.

## 9. Photos and evidence rules

- Receiving: 1–3 material photos per Receipt Line are required.
- Receiving documents: packing slips and related document slots are supported.
- Movement: 0–3 optional proof photos.
- Verification: optional photo.
- Outbound: optional proof photo unless a later policy changes it.
- Damaged Issue: at least one damage photo is required.
- Installation confirmation: 0–3 optional photos; a linked Damaged Issue makes at least one photo required.
- Other Issues and comments: optional photos unless their originating action requires evidence.

Production-like media is stored in a private Supabase Storage bucket. The browser does not receive service-role credentials. Access is authenticated and constrained by application/database authorization.

## 10. Data integrity and safety rules

- UUIDs identify entities; slugs are presentation/routing values, never foreign keys.
- Timestamps are stored in UTC and presented in the user's relevant local context.
- Every operational entity is Site-aware.
- Unknown quantity remains unknown, never zero.
- Partial movements and outbound departures preserve lineage.
- Mutations are transactional where multiple records must change together.
- Client mutation IDs make command replay idempotent.
- Photos are private and linked to typed operational evidence records.
- Actions preserve the historical operator name and authenticated user ID when available.
- Reversals and status transitions preserve originals.
- Account deactivation preserves audit history.
- Temporary test data is not silently promoted into a future company production environment.

## 11. Technical architecture

### Application

- Next.js 16.3 App Router.
- React Server Component shell with narrow client boundaries for interactive workflows.
- TypeScript in strict mode.
- Modular monolith organized by feature ownership.
- Semantic TBS design tokens and reusable shadcn/Base UI primitives.
- Turbopack-compatible production build.

### Persistence

- Supabase Postgres for shared structured records.
- Supabase Auth for temporary email/password identities.
- Supabase Storage for private operational media.
- Row Level Security and protected database functions for authorization.
- IndexedDB for offline queues, photo blobs, local recovery, and pre-Supabase compatibility.

### Hosting

- GitHub `main` is the source branch.
- Vercel hosts the temporary web application.
- Supabase migrations are versioned in the repository and applied deliberately before code that depends on them is promoted.

### Application boundaries

- UI components do not directly read browser storage.
- Use-case services validate business rules.
- Repository adapters implement local or Supabase persistence behind feature-owned boundaries.
- Authenticated Route Handlers validate commands and enforce Operator access.
- Supabase policies remain the final data-security boundary; hiding navigation is not considered authorization.

## 12. Active routes and placeholders

### Active operational routes

- `/` — Operations overview.
- `/inventory` — Inventory Dashboard and project/material locator.
- `/inventory/receiving` — Receiving workflow.
- `/inventory/movements` — Movement workflow and history.
- `/inventory/outbound` — Outbound planning and departure.
- `/inventory/projects` and `/inventory/projects/[slug]` — Project lists and workspaces.
- `/inventory/materials` and `/inventory/materials/[slug]` — Material views.
- `/inventory/storage` and `/inventory/storage/[slug]` — Storage overview/workspaces.
- `/inventory/activity` — Operational activity.
- `/inventory/issues` and `/inventory/issues/[id]` — Issue worklists/details.
- `/reports` — Operational reporting.
- `/administration` — Operator-only account management.
- `/my-work` — Tech Assigned Work, read-only Inventory Search, relevant Outbound context, and installation confirmation.

### Compatibility routes

- `/inventory/material-movements` redirects to `/inventory/movements`.
- Older location/storage aliases remain only where needed for compatibility.

### Planned placeholders

- `/procurement` — planned Operator-only Procurement.
- `/deliveries` — future cross-operational delivery workflow; not owned-trailer management.
- `/projects` — future cross-operational Project Hub.
- `/vendors` — future Supplier/Vendor functionality.

A visible route does not mean its full workflow is implemented. The roadmap and current implementation report determine launch status.

## 13. How a team should run the system

### Recommended responsibilities

These are responsibilities, not an account hierarchy. People may combine several responsibilities, and every person who needs the broad business view uses an Operator account.

**System owner**

- Approves workflow, terminology, and policy changes.
- Controls infrastructure and future production cutover decisions.
- Confirms Site diagrams, printer hardware, and company authentication requirements.

**Account and operations coordinator (Operator)**

- Owns account activation and deactivation.
- Maintains location naming and operating conventions.
- Reviews unresolved blocking Issues and verification backlog.
- Confirms that Receiving, Movement, and Outbound practices match field work.

**Operators**

- Record actions at the time they occur.
- Use unknown values instead of guessing.
- Capture required Receiving and damage evidence.
- Resolve synchronization conflicts promptly.
- Never share accounts.

**Techs**

- Review the inventory and Outbound context needed for project-site work.
- Use only assigned field, delivery, pickup, and installation actions as those modules launch.
- Report damage or discrepancies through the assigned workflow.
- Do not use another person's Operator credentials to gain yard access.

**Product/engineering maintainer**

- Treats the repository as authoritative.
- Creates versioned migrations and phase plans.
- Preserves the design system and existing user flows.
- Tests desktop, mobile, accessibility, offline behavior, and authorization.
- Publishes implementation reports and rollback notes.

### Daily operating rhythm

- Start of day: Review Receiving drafts, queued/conflicted actions, verification worklist, blocking Issues, and planned outbound batches.
- During operations: Record Receiving, location changes, damage, and departure at the point of work.
- End of day: Sync mobile devices, resolve conflicts, review incomplete Receipts and Outbound batches, and investigate unknown locations.
- Weekly: Review overdue verification, Issue aging, storage contents, account access, and backup/export readiness.

### Data-quality rules for the team

- Do not invent quantities, locations, project identities, suppliers, dates, or capacities.
- If information is unknown, record it as unknown and create an Issue when follow-up is required.
- Never reuse a movement or receipt to represent a different physical event.
- Do not delete history to correct a mistake; use reversal, resolution, or a new event.
- Attach evidence to the record it proves.
- Use consistent official project names and add aliases for field wording.

## 14. Release and change-management process

1. Audit the current repository and design system.
2. Write or update a versioned implementation plan.
3. Identify current patterns to reuse.
4. Implement the smallest complete workflow.
5. Add or update database migrations.
6. Validate lint, strict TypeScript, unit tests, production build, responsive flows, and accessibility.
7. Apply and verify database migrations before deploying dependent application code.
8. Commit and push the intended files to GitHub.
9. Confirm Vercel deployed the exact commit—not merely an older redeployment.
10. Perform field-style desktop/mobile acceptance.
11. Publish an implementation report with deviations, validation, risks, and rollback notes.

Major changes create a new phase-plan version. Earlier plans remain as decision history and are not silently rewritten.

## 15. Current limitations and open operational items

- The current Supabase/Vercel environment is temporary.
- Email/password authentication is for demonstration; Microsoft Entra ID or another company-approved identity solution remains a future production decision.
- Custom production SMTP/password recovery is not fully established.
- The live Vercel deployment must always be checked against the intended GitHub commit.
- Tech My Work provides assigned installation work, read-only Inventory Search, relevant Outbound context, and durable installation confirmation.
- Procurement, Purchase Orders, delivery management, and the cross-operational Project Hub are planned, not active.
- QR Labels remain blocked by hardware and label-stock decisions.
- Yard Map geometry remains blocked by a confirmed Site diagram.
- Phase 10 Reporting is implemented but should continue field acceptance and expand with later modules.
- Temporary data requires a deliberate export/import or fresh-environment decision before company production cutover.

## 16. Roadmap status

### Implemented phases

**Phase 1.3 — Yard Domain Foundation**

- Site-aware locations and positions.
- Material Lots, aliases, photos, verification, activity, and minimum Issues.
- Search, project/material/storage workspaces, local persistence, and backup foundations.

**Phase 2 — Receiving Operations**

- Known and unknown shipment Receiving.
- Receipt drafts, inspection, documents, manual labels, storage assignment, and atomic lot creation.

**Phase 3 — Material Movement**

- Full, partial, and batch movements.
- Lot splitting/lineage, history, proof evidence, and reversals.

**Phase 4 — Project Readiness and Outbound**

- Outbound batches, readiness checks, departure, partial quantities, evidence, and reversal.

**Phase 5 — Issues and Material Condition**

- Operational Issue types, priority, assignment, comments, immutable transitions, and required damage photos.

**Phase 6 — Supabase and Authentication**

- Shared database, private media, authenticated commands, RLS, audit records, and temporary accounts.
- Current v2 account model: Operator and Tech.

**Phase 7 — Mobile Yard Companion**

- PWA foundation, offline queue, photo retry, idempotent replay, sync status, and conflict handling.

**Phase 10 — Reporting and Operations Intelligence**

- Permission-aware operational reporting, filters, drill-through, and CSV export.

### Gated phases

**Phase 8 — QR Labels**

Blocked until TBS confirms:

- Thermal printer model.
- Label-stock dimensions.
- Environmental durability.
- Placement workflow.
- Print density and scanning distance.
- Replacement policy.
- Field-tested templates.

When approved, QR values will contain opaque identifiers or short application URLs only—never project, user, PO, or material details.

**Phase 9 — Yard Map**

Blocked until TBS confirms a Site diagram and location naming list. The future map will be an accessible, data-driven SVG linked to real Storage Location IDs. The existing Storage list remains canonical. The next plan must reflect eight Lavon Conex containers.

## 17. Long-term expansion phases

### Phase 11 — Procurement foundation

- Operator-only Supplier Directory.
- Purchase Requests and lines linked to existing projects and Sites.
- Costs, freight, tax, discount, required-by dates, approvals, and immutable history.
- CSV/XLSX import with dry-run validation.

### Phase 12 — Purchase Orders and supplier communication

- Convert approved requests into Purchase Orders.
- Atomic TBS PO numbering.
- Immutable PO revisions.
- Printable private PO PDFs.
- Issued, acknowledged, partially received, received, closed, and cancelled states.

### Phase 13 — Procurement and Receiving integration

- Match a Receipt to open PO Lines.
- Show ordered, received, and remaining quantities.
- Preserve partial receipts and discrepancies.
- Automatically create linked Issues for short, over, wrong, or damaged material.
- Continue supporting unknown/non-PO shipments.

### Phase 14 — Procurement migration, reporting, and cutover

- Import open suppliers, requests, POs, and lines.
- Dry-run errors, checksums, duplicate detection, and idempotent reruns.
- Commitment, expected-delivery, acknowledgement, discrepancy, and supplier reports.
- Pilot and reconcile before replacing the prior system.

### Phase 15 — Operations Project Hub

- Cross-operational project workspace using existing project IDs.
- Delivery destinations, contacts, job status, and Tech assignments.
- Operators see all; Techs will transition from the current read-only shared operational view to assignment-focused views without losing the inventory/outbound context required for their work.
- Supplier and cost information remains hidden from Techs.

### Phase 16 — Deliveries and material pickup

- Convert ready Outbound batches into delivery/pickup tasks.
- Destination, schedule, manifest, handling requirements, and status.
- Assigned Tech handoff/pickup confirmation with the read-only inventory context needed to understand the material.

### Phase 17 — Field installation

- Tech-focused My Work workspace.
- Assigned project materials and installation tasks.
- Not Started, In Progress, Blocked, and Completed states.
- Notes and linked material Issues.
- No operational mutation access to unrelated projects and no access to Procurement, suppliers, costs, or administration.

## 18. Production-readiness path

Before TBS treats the platform as the permanent company system:

1. Select company-approved identity, database, storage, backup, and monitoring services.
2. Confirm whether Microsoft Entra ID remains the identity provider.
3. Recreate migrations and policies in a separately approved production environment.
4. Configure production email/password recovery only if password accounts remain.
5. Validate RLS, storage privacy, session expiry, account deactivation, and audit access.
6. Export and validate temporary data using counts, checksums, referential integrity, and media parity.
7. Import only approved records through an idempotent process.
8. Run desktop Chrome and mobile/desktop Safari acceptance, plus supported Android Chrome testing.
9. Test offline replay, duplicate prevention, conflicts, photo retry, and storage-pressure behavior.
10. Establish backup, restore, incident, account-recovery, and deployment-rollback procedures.
11. Train Operators and Techs on their distinct responsibilities.
12. Cut over only after real TBS workflows reconcile with the prior system.

## 19. What success looks like

TBS Operations is successful when a team member can answer, with evidence:

- What project does this material belong to?
- What material is currently present?
- Exactly where is it stored, or is the location still unknown?
- How much is present, and is that quantity confirmed or unknown?
- When was it last verified?
- What handling or protection restrictions apply?
- Was it received with the required photos?
- Has it moved, split, departed, or been reversed?
- Is there damage, a discrepancy, or another blocking Issue?
- Is the project ready for outbound?
- Who performed each action and when?
- Which project contacts and destination details should be added to assignments without exposing unrelated operations?

The goal is not simply to digitize forms. The goal is a trustworthy operational record that improves material visibility, accountability, handoff quality, and decision-making from the TBS yard to the installation site.

## 20. Related documentation

- Roadmap index: `docs/roadmap/README.md`
- Domain glossary: `CONTEXT.md`
- Operator/Tech authorization plan: `docs/roadmap/phase-06-supabase-authentication/implementation-plan-v2.md`
- Mobile implementation report: `docs/roadmap/phase-07-mobile-yard-companion/implementation-report-v1.md`
- Reporting implementation report: `docs/roadmap/phase-10-reporting-intelligence/implementation-report-v1.md`
- Procurement and long-term roadmap: `docs/roadmap/procurement-and-long-term-roadmap-v1.md`
