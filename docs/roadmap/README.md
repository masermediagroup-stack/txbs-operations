# TBS Operations Roadmap

This directory is the implementation-planning source for the next TBS Operations phases. The repository remains the source of truth for the product, architecture, terminology, and design system. Every phase begins with a fresh repository audit and resolves conflicts in favor of the current implementation unless the current behavior is broken or conflicts with the authorized phase.

## Versioning policy

- Each phase plan is immutable after implementation begins.
- A material change to scope, workflow, interfaces, sequencing, or acceptance criteria creates a new file such as `v2.md`; earlier versions remain available as history.
- Small clarifications may be added before implementation begins and must be recorded in the plan's decision log.
- A phase may not silently absorb work from a later phase.
- Complete and report one phase before beginning the next.

## Sequence

| Phase | Plan | Status | Depends on |
| --- | --- | --- | --- |
| 1.3 | [Yard Domain Foundation](phase-01.3-yard-domain-foundation/v1.md) | [Implemented](phase-01.3-yard-domain-foundation/implementation-report-v1.md) | Current repository |
| 2 | [Receiving Operations](phase-02-receiving-operations/v1.md) | [Implemented](phase-02-receiving-operations/implementation-report-v1.md) | Phase 1.3 |
| 3 | [Material Movement](phase-03-material-movement/v1.md) | [Implemented](phase-03-material-movement/implementation-report-v1.md) | Phase 2 |
| 4 | [Project Readiness and Outbound](phase-04-project-readiness-outbound/v1.md) | [Implemented](phase-04-project-readiness-outbound/implementation-report-v1.md) | Phase 3 |
| 5 | [Issues and Material Condition](phase-05-issues-material-condition/v2.md) | Implemented | Phase 4 |
| 6 | [Supabase and Authentication](phase-06-supabase-authentication/v1.md) ([temporary validation plan](phase-06-supabase-authentication/temporary-validation-plan-v1.md), [implementation plan](phase-06-supabase-authentication/implementation-plan-v1.md)) | [Shared demo deployed; Operator field activation remains](phase-06-supabase-authentication/implementation-report-v1.md) | Phase 5 |
| 7 | [Mobile Yard Companion](phase-07-mobile-yard-companion/v1.md) ([implementation plan](phase-07-mobile-yard-companion/implementation-plan-v1.md)) | [Implemented; shared replay activated by Phase 6](phase-07-mobile-yard-companion/implementation-report-v1.md) | Phase 6 |
| 8 | [QR Labels](phase-08-qr-labels/v1.md) | Gated | Confirmed warehouse and labeling hardware |
| 9 | [Yard Map](phase-09-yard-map/v1.md) | Planned with entry gate | Phase 7 and a confirmed site diagram |
| 10 | [Reporting and Operations Intelligence](phase-10-reporting-intelligence/v1.md) | Planned | Phase 7; Phase 9 only for map drill-through |

Phase 8 is non-blocking. Phases 9 and 10 may proceed while QR labeling remains gated.

## Shared implementation contract

Every phase must:

1. Re-audit routes, layouts, feature modules, types, services, repositories, components, tokens, responsive behavior, tests, and current documentation.
2. Preserve the current shell, compact information hierarchy, semantic TBS tokens, shadcn/Base UI primitives, desktop table patterns, and mobile card/sheet patterns.
3. Reuse or extend existing components before creating new ones.
4. Keep the modular monolith, feature ownership, strict TypeScript, Server Components by default, and narrow client boundaries.
5. Add only use-case-driven repository ports; never add a generic CRUD repository.
6. Keep every operational record site-aware and every mutation auditable.
7. Avoid invented project facts, quantities, capacities, location precision, vendors, model numbers, and performance trends.
8. Pass lint, TypeScript, unit tests, production build, relevant desktop/mobile Playwright scenarios, and axe accessibility checks.
9. Complete field-style acceptance scenarios with the primary yard workflow.
10. Produce the required implementation report and stop before the next phase.

## Shared final report

The report for every phase must include:

- Implemented workflows and user-visible behavior.
- Reused and newly introduced patterns.
- Routes, domain interfaces, repositories, services, and migrations changed.
- Intentional deviations from the phase plan and why current repository behavior won.
- Validation commands and results, including responsive and accessibility evidence.
- Data migration, backup, rollback, and compatibility results where applicable.
- Known limitations and risks.
- Confirmation that work on the next phase has not started.

## Locked roadmap decisions

- Lavon Yard currently models seven numbered Conex containers.
- The planned warehouse is an additional site; it does not erase Lavon history.
- Material becomes `Needs Verification` after 14 days without confirmation.
- Pre-authentication mutations require an operator name every time.
- Every Damaged Issue requires at least one linked damage photo. Other Issue types keep optional photo evidence unless their originating workflow already requires it.
- Local structured records and photos must be preserved and migrated into Supabase.
- Phase 6 uses Microsoft Entra ID and three roles: Operator, Manager, and Administrator.
- The temporary Phase 6 validation site may use administratively created Supabase password accounts with public signup disabled. This exception does not satisfy the final Microsoft Entra acceptance gate.
- The temporary demo provisions one Operator account for normal desktop/mobile use. The existing bootstrap Administrator is setup-only; Manager and additional Administrator accounts are deferred while their authorization rules remain implemented.
- Phase 6 will first validate the production architecture in a visibly labeled, disposable Supabase/Vercel environment. Temporary infrastructure may not weaken Auth, RLS, media privacy, or audit requirements.
- Temporary test data is never silently promoted to production. Repository migrations, policies, tests, and import evidence are recreated against a separately approved production environment.
- Phase 8 stays gated until the warehouse, printer, stock, durability, and placement workflow are confirmed.
- Fleet-asset management is outside the product.
