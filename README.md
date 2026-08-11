# TBS Operations

TBS Operations is the responsive operations workspace for Texas Building Specialties. The current Inventory MVP is built around project material management: answering “What do we have for this project, and where is it?” in a few seconds.

Inventory is the first active domain. Projects are its primary entity, with Materials, Storage, Activity, and Issues as focused submodules. Legacy material and storage URLs redirect to the new project-centric routes.

## Requirements

- Node.js 24.19.0 LTS
- npm 11 or newer
- Git

The repository includes `.node-version` and `.nvmrc`. A workspace-local Node runtime may exist in `.tools/` on the original development machine, but it is intentionally excluded from source control.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

For browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

## Technology

- Next.js 16 App Router and React 19
- TypeScript with strict checking
- Tailwind CSS 4
- shadcn/ui with Base UI primitives
- Lucide icons
- Motion for React
- TanStack Query and Table
- React Hook Form and Zod
- Vitest, Playwright, and axe-core

The data, table, and form packages establish the approved baseline. They are not wired into unused providers or placeholder workflows during Phase 0.

## Structure

```text
src/
├── app/                    App Router layouts and route entry points
├── components/
│   ├── shell/              Responsive application shell
│   ├── shared/             Reused application components
│   └── ui/                 shadcn-owned component source
├── config/                 Typed navigation and route metadata
├── features/               Feature-owned page composition
├── hooks/                  Shared UI hooks
└── lib/                    Small cross-cutting utilities

docs/
├── architecture/           System design and conventions
└── adr/                    Architecture decision records
```

The Inventory feature owns its typed domain model, realistic in-memory seed data, and page composition. Future service, repository, action, and hook folders should be created only when concrete workflows require them.

## Current boundary

The current phase intentionally does not include authentication, Supabase, APIs, CRUD, receiving or movement workflows, QR/barcode scanning, procurement, vendors, delivery management, or production deployment.

See [the architecture overview](docs/architecture/overview.md) and [domain context](CONTEXT.md) before beginning the next phase.

The approved, versioned implementation roadmap is maintained in
[docs/roadmap/README.md](docs/roadmap/README.md). Implement one phase at a time
and stop at its acceptance gate before beginning the next phase.
