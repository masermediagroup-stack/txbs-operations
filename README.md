# TBS Operations

TBS Operations is Texas Building Specialties' responsive web application for receiving, locating, moving, verifying, resolving, and preparing project material from inventory storage through field handoff.

The current deployment is a clearly labeled demonstration environment. Inventory quantities, locations, photos, and activity may contain sample or workflow-test data and must not be treated as the permanent company record.

## Current product

- Project-centered Inventory across Lavon Yard and Richardson Office & Warehouse.
- Eight currently configured Lavon Conex locations plus confirmed yard areas.
- Receiving with drafts, unknown shipments, private evidence, and 1–3 required material photos per line.
- Full, partial, and batch Material Movements with lineage, optional photos, history, and reversal.
- Project readiness and Outbound planning, readiness, departure, evidence, and reversal.
- Issues with assignment, comments, immutable transitions, and required damage photos.
- Verification worklists using the fourteen-day confirmation rule.
- Permission-aware operational Reports with source links and CSV export.
- Operator and Tech account types. Operator is broad trusted-business access; Tech is focused field access.
- Installable mobile PWA with IndexedDB recovery, offline command queueing, manual Sync, photo retry, and conflict handling.
- Shared Supabase database, private media, authenticated command boundaries, RLS, and audit records.
- Vercel deployment from the GitHub `main` branch.

## Operational model

An Inventory Project represents one customer job/project destination. It does not represent multiple job sites. Its physical Material Lots may be stored across multiple TBS inventory Sites. Sites and Storage Locations own physical inventory state; the Project remains the common job record.

Lavon currently contains eight numbered Conex locations. That count is configuration data and may change without redefining the Project or Material Lot model.

## Accounts

- **Operator:** office staff, leadership, material management, yard, and warehouse users who need full operational and administrative access.
- **Tech:** field users who need assigned installation work plus read-only Inventory and relevant Outbound context. Techs do not perform Receiving, yard Movement, Procurement, reporting export, or account administration.

Legacy Manager and Administrator values remain only as database compatibility details in immutable migrations and historical plans.

## Technology

- Next.js 16.3 App Router and React 19
- TypeScript with strict checking
- Tailwind CSS 4 and shadcn/Base UI primitives
- TanStack Query and Table
- React Hook Form and Zod
- Supabase Auth, Postgres, private Storage, and RLS
- IndexedDB and a native service worker
- Vitest, Playwright, and axe-core

## Local development

Requirements: Node.js 24.19.0 LTS, npm 11+, and Git.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` after the development server starts.

Validation:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Repository structure

```text
src/app/                  Next.js routes, layouts, and authenticated endpoints
src/components/           Shell, shared patterns, and shadcn-owned primitives
src/features/             Feature-owned domain, data, service, and UI modules
src/lib/                  Supabase and cross-cutting utilities
supabase/migrations/      Ordered database, RLS, command, and reporting changes
docs/roadmap/             Versioned implementation plans and reports
docs/adr/                 Architecture decisions
```

The repository is the source of truth. New work must preserve the existing shell, TBS tokens, route terminology, compact desktop tables, mobile cards/sheets, audit history, Site awareness, and private evidence rules.

See [the system handbook](docs/TBS-OPERATIONS-SYSTEM-HANDBOOK.md), [domain context](CONTEXT.md), and [versioned roadmap](docs/roadmap/README.md).
