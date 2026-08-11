# ADR 0007: Preserve lot lineage through material movement

- Status: Accepted
- Date: 2026-08-06

## Context

A yard operator may move all or only part of a physical Material Lot. Updating a lot in place works for a complete move, but using the same approach for a partial move would erase which quantity remained at the source and which quantity reached the destination. Corrections must also preserve the original field record.

## Decision

A complete movement updates the existing Material Lot and records an immutable Movement Line containing its source, destination, quantity, and resulting version. A partial movement reduces the source lot and creates a child lot linked to both its parent and root lot. The movement records the child as its resulting lot.

Movement reversal is a new Material Movement. It returns each unchanged resulting lot to the original recorded source without deleting the original event or merging split lots. Reversal stops when a resulting lot has changed since the original movement.

## Consequences

- Total physical quantity remains invariant across complete, partial, batch, and reversal movements.
- Split quantities remain independently traceable even if they later return to the same location.
- Movement correction is conservative: an operator must review material that has changed after the original event.
- Future outbound splitting can reuse the same lineage rules without changing historical movement records.
