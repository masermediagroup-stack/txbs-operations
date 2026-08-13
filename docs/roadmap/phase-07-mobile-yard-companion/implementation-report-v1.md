# Phase 7 Implementation Report v1

- Report date: 2026-08-12
- Source plan: [Phase 7 v1](v1.md)
- Implementation plan: [implementation-plan-v1.md](implementation-plan-v1.md)
- Status: Implemented; shared server replay activated by Phase 6

## Implemented behavior

- Added an App Router web-app manifest, TBS install metadata, Inventory/Receiving/Movement shortcuts, standalone display settings, and the existing brand icon.
- Added a native service worker without changing the Turbopack build. It caches only the public offline shell and same-origin static assets, uses a network-first navigation fallback, cleans obsolete asset caches, and never caches authenticated operational HTML, command responses, administration, reports, or Supabase traffic.
- Added secure service-worker and manifest headers, public routing allowances, and an accessible `/offline` fallback explaining that already-open Inventory screens retain device records.
- Added a top-navigation Yard sync control and full-height mobile sheet showing connection state, local-only command/photo counts, persistent-storage preparation, storage pressure guidance, update availability, conflicts, manual Sync, and recovery-journal export.
- Added a separately versioned `tbs-operations-mobile` IndexedDB database with mutation, photo-blob, conflict, and cache-manifest stores. Queue entries include client mutation ID, command version/type, site, actor snapshot, entity IDs/base versions, payload, retries, and state.
- Added offline journaling after successful local transactions for material add, verification, receiving draft/completion, movement/reversal, Issue creation/lifecycle, and outbound planning/readiness/departure/correction.
- Extracted `File`/`Blob` values into durable photo records and replaced them with references in serializable command payloads.
- Added foreground reconnect and Background Sync registration when supported. Manual Sync remains visible on every supported browser.
- Kept the existing responsive routes instead of creating a second mobile application. Receiving and movement remain fully usable from mobile layouts; receiving and Damaged Issue evidence rules are unchanged, while other workflow photos remain optional.
- Hardened pre-hydration Inventory search and Issue filters so rapid input is not lost. Issue filter URLs now use the Next.js 16-supported native History API and no longer cause competing route refreshes.

## Reused patterns

- Preserved the Server Component shell, Inventory-scoped TanStack Query boundary, semantic TBS tokens, Geist typography, shadcn/Base UI controls, mobile sheets/cards, desktop density, camera inputs, and 44px-or-larger primary mobile targets.
- Preserved the existing orange internal card-divider rule on the offline surface and sync sheet; no orange outer-left card accent was introduced.
- Retained the Phase 1.3 schema-v5 Inventory database as the current operational ledger. The mobile queue is an independent handoff boundary and does not rewrite that repository.

## Routes, interfaces, and infrastructure

- New static routes: `/manifest.webmanifest` and `/offline`.
- New service-worker asset: `/sw.js`.
- New mobile domain: `QueuedMutation`, `QueuedPhoto`, `SyncConflict`, `MobileCacheManifest`, command types, command serialization, and storage formatting.
- New persistence/service boundary: `MobileSyncPersistence`, `IndexedDbMobileSyncPersistence`, and `MobileSyncJournal`.
- New shell components: `MobileSyncProvider` and `SyncStatusControl`.
- Updated Next headers, proxy public-route handling, root metadata, shell composition, and workflow success messaging.

## Phase 6 replay activation

Phase 6 now provides authenticated, use-case-specific Supabase command adapters, private upload staging, versioned Route Handlers, idempotent command receipts, entity-version conflict responses, RLS, and database audit history.

The Phase 7 journal now replays queued commands in order when an authenticated device reconnects or the Operator selects Sync. Photo blobs upload first, successful commands and their blobs are removed, duplicate command IDs are accepted idempotently, and stale entity versions enter the conflict inbox. IndexedDB remains the offline cache and recovery boundary.

The remaining field task is to validate the same single Operator account on the stable Vercel site from a supported desktop browser and physical phone. Pending work is retained across sign-out; it is never silently discarded.

## Migration and rollback

- Mobile IndexedDB begins at schema version 1 and does not alter Inventory schema v5 or Supabase migrations.
- Service-worker upgrades preserve Inventory records, queued commands, photo blobs, conflicts, and device-preparation metadata.
- The recovery journal can be exported independently; the existing Inventory archive remains the complete local record/photo backup.
- Rollback may unregister the worker and remove versioned asset caches without deleting either IndexedDB database.

## Validation evidence

- `npm run typecheck`: passed with strict TypeScript.
- `npm run lint`: passed.
- `npm test`: 4 files and 35 tests passed, including command serialization, photo extraction, client-mutation deduplication, manifest preparation, and storage summaries.
- `npm run build`: passed on Next.js 16.3.0 with Turbopack, including the manifest, offline fallback, and authenticated command routes.
- Full Playwright production suite using installed Chrome: 38/38 passed with four workers across Desktop Chrome and Pixel 7 projects.
- Phase 7 browser coverage includes manifest/service-worker headers, persistent-storage preparation, offline movement journaling, manual Sync gating, offline fallback, mobile sheet behavior, and duplicate prevention.
- Axe WCAG 2/2.1 A/AA checks passed on the new Yard sync sheet and existing Overview, Receiving, Outbound, Issue, and Movement acceptance flows.

## Known risks

- Physical cross-device replay still needs field validation with the single Operator account on the stable Vercel URL.
- Background Sync is browser-dependent; foreground reconnect and manual Sync are the required portable paths.
- Persistent-storage requests are browser decisions. Operators must keep a current Inventory backup when persistence is denied or storage pressure is reported.
- The current scalable SVG manifest icon follows the existing brand asset. Device-specific raster install artwork can be added later without changing the queue or service-worker contract.

## Phase boundary

Phase 8 QR Labels, Phase 9 Yard Map, and Phase 10 Reporting work were not started. Phase 7 shared replay is now active through the Phase 6 command/read adapters.
