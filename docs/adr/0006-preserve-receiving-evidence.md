# ADR 0006: Preserve receiving evidence across identity resolution

- Status: Accepted
- Date: 2026-08-06

## Context

Inbound material may arrive with an official project match, only handwritten wording, damaged packages, duplicate paperwork numbers, or no confirmed identity. Receiving must create trustworthy inventory without rewriting what operators originally observed.

## Decision

A Receipt is a durable workflow record with one or more Receipt Lines. Drafts may be edited until completion. Completing a matched Receipt atomically creates Material Groups, Material Lots, verification records, evidence links, issues, and one receiving activity event. A failed completion creates no partial lots.

An unmatched Receipt can still be completed. It keeps its original field-label text, documents, package lines, and unresolved identity state and creates a linked `Unknown shipment` Issue. Later resolution will attach the Receipt to a project without replacing its original evidence. Duplicate receipt numbers warn operators but never merge records automatically.

## Consequences

- Unknown shipments remain traceable instead of being discarded or forced onto a project.
- Receipt numbers are operational references, not unique identifiers.
- Draft edits are allowed; completed receiving evidence is corrected through later auditable workflows.
- Material with an explicitly unknown count remains unknown rather than contributing zero to derived totals.
