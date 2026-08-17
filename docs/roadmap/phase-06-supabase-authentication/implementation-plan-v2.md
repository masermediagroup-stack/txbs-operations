# Phase 6 — Operator and Tech Account Model v2

## Decision

The temporary and future user-facing account model has two account types only:

- **Operator:** full current yard operations plus administrative control over accounts, sites, configuration, reports, and exports.
- **Tech:** field-installation account. Techs do not receive Inventory, Receiving, Movement, Outbound, Reports, Procurement, or account-administration access until their assigned field-work workflows are implemented.

Earlier v1 documents remain immutable history. Manager and Administrator are retired as user-facing account names. Existing records using either legacy value migrate to Operator without deleting history.

## Implementation and migration

- Add `Tech` to the database role enum.
- Convert existing Manager and Administrator profiles to Operator.
- Keep legacy enum values only as an internal compatibility detail for earlier immutable migrations and the v1 command contract.
- Give Operators administrative and all-site operational authorization.
- Remove Tech site memberships and deny Tech access at database, Route Handler, route, navigation, offline-sync, and UI boundaries.
- Account Administration exposes only Operator and Tech choices and prevents an Operator from removing their own access.

## Rollback

Restore the prior application build and reassign affected profiles through controlled SQL. PostgreSQL enum values are additive and `Tech` remains harmless if unused. No operational records, photos, audit events, or historical operator names are rewritten.

## Acceptance

- Existing Administrator and Manager profiles appear as Operator.
- An Operator can activate, deactivate, and assign Operator or Tech accounts.
- An Operator can complete all current workflows and privileged corrections.
- A Tech sees no yard modules and receives `403` from inventory command, snapshot, upload, and media endpoints.
- Public role labels contain no Manager or Administrator options.
- Lint, strict TypeScript, unit tests, production build, and production deployment pass.
