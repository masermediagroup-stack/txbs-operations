# Phase 6 — Operator and Tech Field Access v4

## Status

Current implementation contract as of August 19, 2026. Versions 1–3 remain immutable decision history and are superseded where they describe Manager/Administrator user-facing roles or a read-only-only Tech workspace.

## User-facing account types

- **Operator:** broad trusted-business access for office, leadership, material management, yard, warehouse, reports, Outbound, and account access. This is an access scope, not a job title or rank.
- **Tech:** focused field access to Assigned Work, global read-only Inventory Search, relevant Outbound context, and installation confirmation.

Legacy Manager and Administrator enum values remain only for database compatibility and are interpreted as Operator by current application boundaries.

## Tech mutation boundary

Techs cannot call Receiving, yard Movement, Outbound-control, Reports-export, Procurement, configuration, or account-management commands. Their only operational mutations are:

1. Start an assignment allocated to their authenticated profile.
2. Confirm installation quantities for that assignment.
3. Attach zero to three private installation photos.
4. Create a linked field Issue for damaged, missing, wrong, or blocked material. Damaged requires at least one photo.

Every command is authenticated, idempotent, version-checked, Site-aware, audited, and protected again by RLS/security-definer authorization. Offline field commands retain photo blobs and replay through the same endpoint; conflicts pause for human review.

## Operator field workflow

An Operator may assign a Ready or Departed Outbound Batch to an active Tech, reassign active work, cancel it through a transition event, and review confirmations. Operators retain all operational access.

## Acceptance

- Operator and Tech are the only user-facing account choices.
- Operators can manage active Tech assignments.
- Techs see only their assignments while retaining read-only pickup/install Inventory context.
- Direct Tech calls to unrelated command endpoints receive `403` or RLS denial.
- Private media, identity, UTC time, line quantities, Activity/Audit history, idempotency, and entity versions are preserved.
- Offline confirmations replay once; newer server versions enter the conflict inbox.
