# ADR 0002: Defer repository ports until concrete use cases

- Status: Accepted
- Date: 2026-08-03

## Context

Supabase is the intended future persistence platform, but Phase 0 has no database, domain entities, or business use cases. Empty repository interfaces would encode guesses and create architecture without a testable purpose.

## Decision

Document a feature-owned data-access convention now. Add a narrow repository port only when a real use case defines its required operations, and implement both an in-memory test adapter and a Supabase adapter.

## Consequences

- UI and business code will not import Supabase directly.
- Repository methods will be driven by domain behavior rather than generic CRUD.
- Phase 1 must establish its first real seam before persistence code is introduced.
