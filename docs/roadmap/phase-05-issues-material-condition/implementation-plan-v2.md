# Phase 5 Implementation Plan v2

- Plan version: v2
- Source plan: [Phase 5 v2](v2.md)
- Baseline audited: 2026-08-10
- Implementation status: Approved to begin

## Repository audit findings

- The Inventory module is a Next.js 16.2.12 modular monolith. App Router pages and layouts remain Server Components while the Inventory provider owns the narrow client boundary required by TanStack Query and IndexedDB.
- `/inventory/issues` is already repository-backed. Foundation Issue creation, operator attribution, Receiving-created Unknown Shipment and Damaged Issues, blocking readiness, and portable backup support are implemented and must be extended rather than replaced.
- Inventory persistence is one versioned snapshot plus image blobs behind `InventoryPersistence`, with IndexedDB and in-memory adapters. The established `createInventoryService` module is the single transaction owner.
- The current Issue model has type, priority, Open/Resolved/Dismissed state, blocking, assignee name, project/lot/receipt links, and timestamps. It does not yet have In Progress, Issue-linked photos, comments, immutable transitions, complete linked-entity coverage, assignment actions, resolution actions, or unknown-receipt resolution.
- Current UI uses compact shadcn/Base UI Cards, Fields, native selects, Alerts, Badges, Sheets, dense desktop tables, mobile cards, full-height sheets, semantic TBS tokens, and screen-reader-only page headings.
- Phase 4 readiness currently treats only Open Issues as active. Phase 5 must treat both Open and In Progress as active and preserve project operational status separately.
- The repository has no available Git executable or metadata history to inspect.
- Audited baseline passes full ESLint, strict TypeScript, 24 unit tests, and the production Turbopack build.

## Intentional deviations from the original Phase 5 prompt

1. Do not replace `/inventory/issues` as if it were hard-coded. It already reads durable snapshot data; Phase 5 will evolve that working surface.
2. Preserve the current `Urgent` priority instead of renaming it to `Critical`. This avoids changing established terminology without an operational need.
3. Add narrow Issue commands to the established Inventory service interface instead of introducing a separate Issue repository. IndexedDB and in-memory adapters already provide the real persistence seam.
4. Use `/inventory/issues/[id]` for addressable Issue detail rather than a desktop-only transient panel. The detail workspace will use the same route on mobile and desktop.
5. Reuse existing Receiving material photos for automatically created Damaged Issues. Duplicate photo capture and duplicate blobs are prohibited.
6. Track supplier-return follow-up through Issue comments and resolution history only. Supplier directories, return authorization, claims, and shipping workflows remain out of scope.

## Domain changes

- Advance Inventory schema version 4 to 5.
- Expand Issue status to Open, In Progress, Resolved, and Dismissed.
- Add location, movement, and outbound links to the existing project, lot, and receipt links.
- Add linked Issue photo IDs, current resolution note, and an idempotency key for retry-safe creation.
- Add `IssueComment` for append-only discussion and optional evidence.
- Add `IssueTransition` for immutable Created, Assigned, Linked, and Status Changed history with actor name, nullable future user ID, timestamps, prior/current status, and note.
- Add `issueId` to Photo Record so issue evidence remains discoverable while retaining existing operational links.
- Define active Issue state as Open or In Progress. Resolved and Dismissed Issues do not block Project Readiness.
- Derive damage-evidence state from linked valid image records. Newly created Damaged Issues require evidence; migrated legacy records may remain readable as Needs Evidence until a photo is added.

## Transactional use cases

- `recordIssue`: validate linked records and site consistency, require title/operator, enforce a client idempotency key, persist optional evidence, require evidence for Damaged, create the initial transition and global activity atomically.
- Automatic Receiving Issue creation: use deterministic origin keys, link required line photos to Damaged Issues, and prevent retry duplicates.
- `assignIssue`: assign or unassign by name with required acting operator and immutable assignment history.
- `addIssueComment`: require comment text or a photo, persist optional photo blobs atomically, add the evidence to the Issue, and preserve global activity.
- `transitionIssue`: enforce valid state changes and required notes; require damage evidence before completion; preserve immutable transition/activity history.
- Unknown Shipment resolution: require the matching Project when resolving, update Receipt identity association without changing handwritten text, inspection evidence, original operator, or Receiving timestamps.

## Migration and rollback

- Migrate schema 1–4 snapshots directly to schema 5 without losing prior fields.
- Add nullable Issue links, empty comments, and immutable creation transitions for existing Issues.
- Reuse matching Receiving photo records for legacy Damaged Issues when receipt/lot evidence already exists.
- Leave unmatched legacy Damaged Issues readable with a Needs Evidence state; never invent media.
- Advance IndexedDB database version to 5 while retaining the same stores and atomic snapshot/blob commit.
- Preserve schema 5 records and media in the existing checksum backup format.
- Rollback requires a pre-phase portable backup. Append-only Issue history is never destructively rewritten.

## Routes and navigation

- Preserve `/inventory/issues` in its current sidebar position.
- Add `/inventory/issues/[id]` for Issue detail, comments, evidence, assignment, linked records, and lifecycle actions.
- Add a stable `Issue detail` breadcrumb label instead of exposing UUIDs.
- Add Record Issue entry points to project, lot, storage location, receipt, movement, and outbound surfaces without moving their primary actions.

## UI and design plan

### Existing token system

- TBS blue `#014F6E`: primary actions, focus, navigation.
- TBS orange `#F36C21`: restrained internal section divider and operational emphasis.
- Graphite `#54585A`: brand neutral.
- Canvas `#F5F5F5`: application background.
- Raised surface `#FFFFFF`: cards, sheets, and evidence panels.
- Destructive `#B42318`: damage/urgent/blocking semantics, always paired with text or an icon.

Typography remains Geist for headings/body and Geist Mono for counts, ages, and timestamps. No new font, radius, shadow, or raw color is introduced.

### Worklist layout

```text
Desktop
┌ Issues summary + Record issue ┐
├ Filters: state | type | priority | project | assignee | age ┤
├ Dense issue table ───────────────────────────────────────────┤
│ state  issue + link  project/location  assignee  age  action │
└───────────────────────────────────────────────────────────────┘

Mobile
┌ Record issue ┐
├ Filter sheet ┤
├ Issue card: state/type, title, link, assignee, age ┤
└ Open issue ────────────────────────────────────────┘
```

### Detail layout

```text
Desktop: linked-record summary + evidence | assignment/actions
         chronological comments and immutable transition history

Mobile:  state summary → evidence → linked record → actions
         chronological discussion/history with sticky primary action
```

The characteristic Phase 5 element is an evidence-first damage panel: Damaged Issues surface the required photo beside the material and source record, while non-damage Issues keep evidence visually secondary. Cards that use the orange accent place it on the internal divider below title/description per `AGENTS.md`.

## Accessibility and responsive behavior

- Use native labelled controls, Field validation attributes, visible focus, text plus icon/status labels, and no color-only meaning.
- Required damage evidence receives `aria-invalid`, an inline Field error, file-type validation, filename/preview feedback, and camera capture support.
- Maintain at least 44px primary mobile targets, full-width mobile controls, full-height sheets, sticky completion actions, and no hover-only behavior.
- Issue history uses semantic lists and machine-readable timestamps. Tables receive accessible headers and mobile card equivalents.
- Empty and no-result states use the installed Empty component.

## Test plan

- Schema 1–4 migration to 5, existing Issue preservation, creation transitions, Receiving photo reuse, and legacy Needs Evidence behavior.
- Every Issue type, priority, active/closed state, valid/invalid transition, assignment/unassignment, comment, photo, and linked entity.
- Manual and automatic Damaged Issue evidence enforcement; non-damage optional photos; blob retention across reload and backup round-trip.
- Idempotent manual/automatic creation and atomic failure with no partial records or blobs.
- Unknown Shipment Project resolution without rewriting original evidence.
- Project Readiness and outbound readiness for Open/In Progress versus Resolved/Dismissed blocking Issues.
- Desktop and mobile Playwright workflows for create, filter, open, assign, comment, resolve, reopen, damage evidence, and linked navigation.
- Axe checks on Issue list, Issue detail, and creation/action sheets at desktop and Pixel 7 viewports.

## Acceptance scenarios

1. A yard operator finds a damaged glass mirror after Receiving, opens Record Issue from its lot, and cannot save until a damage photo and operator name are provided.
2. A damaged receipt line automatically creates one Damaged Issue that reuses its required Receiving photo and remains duplicate-free on retry.
3. A manager assigns an Issue by name, records follow-up for a supplier return, resolves it with a note, and can later reopen it without losing prior history.
4. An Unknown Shipment Issue is linked to a confirmed Project during resolution while its handwritten label and original Receiving evidence remain unchanged.
5. Resolving or dismissing a blocking Issue updates readiness; reopening it blocks readiness again.

## Delivery gates

- Full ESLint, strict TypeScript, unit tests, production build, desktop/mobile Playwright, and axe checks pass.
- Portable backup round-trip preserves Issue records, comments, transitions, and image blobs.
- Final report documents behavior, routes, schema migration, deviations, evidence rules, responsive/accessibility proof, validation results, risks, rollback, and confirmation that Phase 6 was not started.
