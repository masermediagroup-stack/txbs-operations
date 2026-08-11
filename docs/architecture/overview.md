# Architecture Overview

## System shape

TBS Operations is a single Next.js application organized as a modular monolith. This keeps deployment and cross-module navigation simple while preserving feature ownership as the product grows.

The App Router owns URL structure and shared layouts. Feature folders own page composition and, in later phases, business use cases and data-access ports. Shared components are limited to UI that is genuinely reused.

## Rendering model

- Pages and layouts remain React Server Components by default.
- Client boundaries are limited to interactive shell components such as sidebar state, path-aware navigation, and dropdown menus.
- No global data provider is introduced until a concrete client-side data requirement exists.
- Operational state should be addressable through URLs where practical.

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

## Future data access

Do not add a generic `Repository<T>` abstraction. Inventory uses a narrow persistence port driven by real lot, verification, issue, backup, receiving, movement, readiness, and outbound use cases. IndexedDB and in-memory adapters implement that port; Supabase will replace the production adapter in Phase 6 without changing workflow components.

```text
Inventory use case
        │
        ▼
Feature-owned repository port
        │
        ├── In-memory/test adapter
        └── Supabase adapter
```

This keeps React components independent of storage details without guessing at interfaces before the domain behavior exists.

## Quality gates

Every change should pass linting, TypeScript, unit tests, and a production build. Shell or routing changes also require browser checks at mobile and desktop viewports and an accessibility smoke test.
