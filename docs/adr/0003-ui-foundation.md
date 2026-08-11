# ADR 0003: Use semantic TBS tokens with shadcn Base UI

- Status: Accepted
- Date: 2026-08-03

## Context

The application needs an understated, responsive operations interface inspired by inFlow's clarity while retaining TBS identity. Accessibility and maintainability matter more than decorative branding.

## Decision

Use shadcn's Base UI-backed component source, Tailwind CSS 4, Geist typography, Lucide icons, and semantic CSS variables. TBS blue is the primary interaction color, orange is a restrained accent, and graphite supports neutral brand expression. Phase 0 is light-mode only.

## Consequences

- Component behavior starts from accessible primitives.
- The palette can evolve centrally without rewriting components.
- Orange is not used as normal text on white because it lacks sufficient contrast.
- Product pages share one density, radius, focus, and spacing system.
