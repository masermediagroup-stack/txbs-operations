# ADR 0004: Organize Inventory around project materials

- Status: Superseded by ADR 0005
- Date: 2026-08-05

## Context

Lavon yard employees locate material by project name, purchase order, job number, and physical storage—not by isolated SKU. A project can span several locations, and one Conex can hold several projects.

## Decision

Make Inventory Project the aggregate presented to users. Material Groups connect projects to Storage Locations and carry practical pallet and box counts. Projects own photos, notes, status, and activity history. Detailed inventory, receiving, movement, QR, and delivery workflows remain outside this phase.

Inventory navigation is focused on Dashboard, Projects, Materials, Storage, Activity, and Issues. The broader Operations-level Projects entry is deferred until projects represent more than inventory material.

## Consequences

- The default workflow answers what material exists for a project and where it is stored.
- Search can index project, PO, job, material group, Conex, and storage-area terms.
- Storage remains many-to-many with projects through Material Groups.
- Future persistence can replace mock data without changing route or component contracts.
