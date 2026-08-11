# ADR 0008: Preserve outbound departure and reversal evidence

- Status: Accepted
- Date: 2026-08-07

## Context

Outbound material may leave as a complete lot or as part of a lot. Correcting an incorrect departure by editing the original batch or merging a returned partial quantity into its source would erase who recorded the departure, what left, and how the correction occurred.

## Decision

A complete departure marks the selected lot Removed. A partial departure reduces the present source lot and creates a Removed child lot using the existing parent/root lineage model. The Outbound Line preserves the source location, position, quantity, package type, material name, handling requirements, and resulting lot version.

Reversal creates a new Reversed Outbound Batch linked to the original Departed batch. It restores only unchanged removed result lots to their recorded source and never deletes the original batch or merges split lots. The original batch remains Departed so the field evidence stays immutable.

## Consequences

- Present and departed quantities remain reconcilable after full, partial, and reversed departures.
- A returned partial lot remains independently traceable even when it occupies the same source location again.
- Automatic reversal stops when departed material changed after departure and requires later manager review.
- Reports can distinguish the original departure from its compensating correction.

