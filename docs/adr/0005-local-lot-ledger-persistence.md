# ADR 0005: Use a versioned local lot ledger before shared infrastructure

- Status: Accepted
- Date: 2026-08-06

## Context

Yard workflows now need durable quantities, exact or explicitly unknown positions, photos, verification history, and audit events before Supabase and authentication are available. The earlier material-group pallet and box fields cannot preserve lot lineage or distinguish unknown data from zero. Device-local records must later migrate without losing operator names or image evidence.

## Decision

Material Lots are the source of truth for physical inventory. Totals are derived from present lots. Inventory uses one feature-owned persistence port with a real IndexedDB adapter and an in-memory test adapter; UI components call use-case methods and never browser storage directly. The Inventory route subtree owns the only client query boundary.

IndexedDB stores a versioned normalized snapshot and original photo blobs. Every mutation requires an operator name, increments the dataset revision, and appends an Activity Event. Portable JSON archives contain the validated snapshot, photo blobs, and SHA-256 checksums.

Each legacy Material Group migrates to one `Mixed` lot with the known combined package count. The original pallet and box split is retained as migration evidence. Position, condition, protection, and access are not inferred; operators confirm them in the field.

## Consequences

- Phase 1.3 records survive reloads and can be imported into future shared storage.
- Stale device writes are rejected using the snapshot revision.
- Backup files are larger than record-only exports because they contain original media.
- IndexedDB remains an adapter detail and can be replaced without changing workflow components.
- The legacy pallet and box views may remain temporarily for untouched screens, but they are no longer authoritative.
