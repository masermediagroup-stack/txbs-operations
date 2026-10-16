# Architecture Overview

Current implementation description, reconciled with source on 2026-10-16. The
[Master Plan](../../TODO.md) owns status and release gates; implemented code does
not establish physical-device or production acceptance.

## System shape

TBS Operations is a single Next.js application organized as a modular monolith. This keeps deployment and cross-module navigation simple while preserving feature ownership as the product grows.

The App Router owns URL structure and shared layouts. Feature folders own page composition and, in later phases, business use cases and data-access ports. Shared components are limited to UI that is genuinely reused.

## Rendering model

- Pages and layouts remain React Server Components by default.
- Client boundaries contain interactive forms, tables, navigation and recovery controls.
- Inventory owns a scoped TanStack Query provider. The mobile sync provider coordinates prepared records, the local journal, connection state and recovery; there is no generic application-wide business-data store.
- Operational state should be addressable through URLs where practical.
- Account-specific operational pages render dynamically. The public offline fallback also renders dynamically so its reconnect control receives the nonce required by CSP; the service worker caches that public response for offline use.

## Route hierarchy

The `(operations)` route group applies one shell without changing public URLs. `/inventory` is a project-material locator. Project workspaces live at `/inventory/projects/[slug]`, while Materials, Storage, Activity, and Issues remain focused Inventory views.

Typed route metadata in `src/config/navigation.ts` is the source for sidebar navigation, active states, breadcrumbs, labels, and descriptions. Legacy Storage Units, Locations, and Material Movement routes redirect to the new information architecture.

## Responsive shell

- Desktop uses a persistent sidebar that collapses to icons.
- Tablet and mobile use the same navigation model through an off-canvas sheet.
- Content follows mobile-first grids and maintains usable touch targets.
- Breadcrumbs reduce to the current route when horizontal space is limited.
- The shell includes semantic landmarks, keyboard focus, a skip link, and reduced-motion handling.

## Design system

shadcn/ui component source provides accessible primitives. Tailwind semantic tokens map the official TBS palette into application roles:

- `#014F6E` — primary interaction and navigation state
- `#F36C21` — restrained accent and operational emphasis
- `#54585A` — graphite brand neutral

Components consume semantic classes such as `bg-primary`, `text-muted-foreground`, and `border-border` rather than embedding brand hex values.

## Current data access and commands

Inventory has a local service backed by IndexedDB and a remote service that calls
authenticated Next.js endpoints. The provider selects the shared online service
or prepared local state according to backend and connectivity. Shared snapshots
are validated before entering the client cache. In-memory adapters support tests.
Keep these use-case interfaces narrow; do not add a generic `Repository<T>`.

```text
Inventory interface
  ├── online remote service → authenticated Route Handler → Postgres command
  └── prepared IndexedDB state → scoped command/photo journal → reviewed replay
```

Shared commands validate actor, role, payload and Site context, then call versioned
database functions. Database grants, RLS and explicit command authorization remain
separate controls. Command identities support idempotent retries; expected record
versions expose conflicts instead of silently overwriting another worker's work.
Evidence uses private Storage, staged upload identities and server verification
of byte count, media signature, MIME type and SHA-256 before command consumption.

The service worker caches public shell/static assets, not authenticated HTML.
Prepared records and pending commands/photos live in account/environment-scoped
IndexedDB stores. Replay checks the original account, current session, dependencies
and unresolved conflicts. The temporary replay hold remains a separate release
gate; these mechanisms do not establish physical iPhone/Android acceptance.

Implementation references: `src/features/inventory/components/inventory-provider.tsx`,
`src/features/inventory/services/remote-inventory-service.ts`,
`src/app/api/inventory/commands/v1/route.ts`,
`src/features/inventory/server/verify-evidence.ts`,
`src/features/mobile/domain/replay-guard.ts`, and `public/sw.js`.

## Expansion boundary

The expanded specification adds commercial documents, procurement, product UOM,
handling-unit lineage and barcode workflows. Those are ticketed behind the Master
Plan's stabilization and rollout dependencies. The synthetic barcode bench is an
isolated compatibility experiment; the production application does not yet provide
integrated scanner resolution or a label-print lifecycle.

## Quality gates

Every change should pass linting, TypeScript, unit tests, and a production build. Shell or routing changes also require browser checks at mobile and desktop viewports and an accessibility smoke test.
