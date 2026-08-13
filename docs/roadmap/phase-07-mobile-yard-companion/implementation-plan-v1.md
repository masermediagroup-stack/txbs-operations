# Phase 7 Implementation Plan v1

- Plan version: v1
- Source plan: [Phase 7 v1](v1.md)
- Baseline audited: 2026-08-12
- Implementation status: Device foundation complete on 2026-08-12; shared replay remains gated by Phase 6 command adapters

## Repository audit findings

- The application remains a Next.js 16.2.12 App Router modular monolith with Server Component layouts and one Inventory-scoped TanStack Query client boundary.
- Receiving, movement, verification, outbound, and Issue workflows are already responsive and camera-capable. They persist a schema-v5 normalized snapshot and image blobs through `InventoryPersistence` and `IndexedDbInventoryPersistence`.
- Supabase password authentication, profile lookup, site-aware relational migrations, RLS policies, entity-version columns, command receipts, and private-upload staging tables exist. The UI does not yet read or mutate the relational model; `InventoryProvider` still creates the local IndexedDB service directly.
- There are no authenticated versioned command Route Handlers or Supabase use-case adapters for receiving, movement, verification, issues, outbound, or photo replay. Therefore Phase 7 cannot safely claim cross-device synchronization, server authority, idempotent replay, or server-version conflict detection yet.
- The shell, semantic TBS tokens, compact desktop hierarchy, mobile sheets/cards, 44px primary mobile controls, camera file inputs, and orange internal card divider are established patterns and remain authoritative.
- The repository baseline is clean on `main`; the initial application is published to `origin/main` and the temporary Vercel/Supabase environment exists.
- Installed Next.js documentation confirms native `app/manifest.ts`, a hand-authored service worker, and explicit secure service-worker headers without changing the Turbopack production build.
- Current browser guidance confirms Background Sync is not Baseline and requires HTTPS; foreground reconnect and a visible manual Sync action are mandatory.

## Intentional Phase 6 dependency deviation

Phase 7 will not invent a generic sync endpoint or mark local records as server-confirmed. This implementation has two independently releasable layers:

1. **Phase 7 device foundation:** installable manifest, native service worker, offline fallback, update handling, connection/storage indicators, a separately versioned mobile IndexedDB queue/photo/conflict store, manual Sync surface, foreground reconnect hooks, Background Sync registration when available, and recovery/export behavior.
2. **Phase 7 server replay activation:** authenticated command dispatch, private photo upload intents, idempotent responses, authoritative cache manifests, and entity-version conflict resolution. This layer remains fail-closed until the Phase 6 command adapters exist.

Offline mutations may continue to use the already-authoritative device ledger for current testing. When an action is performed without connectivity, its serializable command envelope and photo blobs are also journaled as `Waiting for shared sync`. The app never labels those journal entries synchronized, never discards them automatically, and explains that another device will not receive them until server replay is activated.

This preserves working Phase 1.3–5 behavior while creating the exact queue boundary Phase 6 commands will consume. It is a recorded limitation, not completion of the cross-device acceptance gate.

## Domain and persistence changes

- Add `QueuedMutation`, `QueuedPhoto`, `SyncConflict`, `SyncConnectionState`, `SyncRunState`, and `MobileCacheManifest` schemas.
- Every queued envelope contains a UUID client mutation ID, command type/version, site ID, actor snapshot, creation time, entity IDs, entity base versions, serializable payload, retry count, and state.
- Store the mobile journal in `tbs-operations-mobile`, separate from the schema-v5 inventory backup database. Use independent object stores for mutations, photo blobs, conflicts, and metadata.
- Preserve queued commands and photos across service-worker updates. Provide a portable JSON journal export with photo metadata; the existing Inventory archive remains the complete record/photo rollback source.
- Request persistent browser storage when the user chooses Prepare this device. Report storage estimate and pressure risk without treating a denied request as an error.

## PWA and service-worker behavior

- Add `app/manifest.ts` using the existing TBS icon, brand colors, standalone display, and `/inventory` start URL.
- Register `/sw.js` from a narrow client provider. Set `updateViaCache: "none"` and show an Update available action instead of activating a waiting worker mid-operation.
- Cache only the public offline fallback, manifest/icon, and immutable same-origin Next.js assets. Do not cache authenticated HTML, administration, reports, exports, API responses, or Supabase traffic.
- Use a cached offline fallback for failed navigations. An already-open Inventory screen continues to use IndexedDB data and actions when connectivity changes.
- Register `tbs-operations-sync` only when Background Sync exists. Always replay on foreground reconnect and through the manual Sync control.
- Service-worker rollback removes incompatible asset caches but never deletes IndexedDB journals or Inventory records.

## UI design plan

### Existing token system

- TBS blue `#014F6E`: primary actions and online/ready state.
- TBS orange `#F36C21`: restrained pending/update emphasis.
- Graphite `#54585A`: neutral/cached state.
- Destructive token: conflict/error state, always paired with text and icon.
- Existing Geist headings/body and Geist Mono timestamps/counts remain unchanged.

### Layout

```text
Desktop header: breadcrumbs ───────── Search | Sync status | Alerts | User

Mobile header:  menu | page ───────── Search | Sync status | User
                                         │
                                         └─ full-height Yard sync sheet
                                            connection / pending / conflicts
                                            Prepare device / Sync now / Update
```

The characteristic Phase 7 element is a compact yard-signal control in the existing top bar: one icon and plain status label/count, expanding into a practical sync sheet. It uses no new navigation destination and does not compete with the operational action on the current page.

## Workflow integration

- Journal offline receiving draft/completion, movement/reversal, verification, material-add, Issue lifecycle, and outbound commands after their local transaction succeeds.
- Extract File values into `QueuedPhoto` records and keep only photo references in serializable payloads.
- Surface offline/pending wording in action confirmations. Existing receiving and Damaged Issue photo requirements remain unchanged; other workflows keep optional photos.
- Prevent duplicate journal insertion by client mutation ID.
- Manual Sync remains enabled. Until the Phase 6 dispatcher is available it performs validation, retains every command, and returns an explicit shared-sync-not-active result.

## Accessibility and responsive behavior

- Sync status is announced through a polite live region and always includes text in the expanded sheet.
- All primary actions remain at least 44px on mobile, keyboard reachable, and visible without hover.
- Pending, offline, conflict, and update states use icon plus text and never rely on color alone.
- Storage usage receives a human-readable summary; technical byte counts remain secondary.

## Migration and rollback

- Mobile database begins at schema version 1 and never alters the Inventory schema-v5 database.
- Normal updates preserve queue and photo stores. A future incompatible queue migration must export or block instead of clearing pending work.
- Rollback unregisters `/sw.js` and clears versioned asset caches only. Inventory data, queued commands, queued photos, and conflicts remain recoverable.
- Sign-out cleanup cannot delete pending work silently; the user must explicitly export/discard once account-scoped shared caches are introduced.

## Tests and acceptance

- Unit-test domain parsing, serialization, deduplication, photo retention, storage summaries, and fail-closed sync results.
- Playwright-test manifest, service-worker headers, offline fallback, online/offline indicator, Prepare device, manual Sync, update UI, mobile sheet behavior, and axe accessibility.
- Verify the current receiving, movement, verification, issue, and outbound mobile flows remain usable with the service worker registered.
- Production build must remain Turbopack and pass lint, strict TypeScript, unit tests, Playwright, and axe.

## Exit states

- **Device foundation complete:** installable shell, offline fallback, local offline workflows, persistent queue/photo journal, manual/foreground sync coordination, status UI, update safety, tests, and documentation pass.
- **Phase 7 complete:** requires Phase 6 shared command/read adapters, successful cross-device replay, private photo retry, real entity-version conflict tests, sign-out cache cleanup, and supported-device field evidence.
- Phase 8 QR work is not started.
