# Procurement and Long-Term Operations Roadmap v2

- Version: v2
- Planned: 2026-08-18
- Status: Planned
- Supersedes for future implementation: `procurement-and-long-term-roadmap-v1.md`

## Scope corrections

- Operator is broad trusted-business access, not a yard job title or rank. Office staff, leadership, material management, yard, and warehouse users may all be Operators.
- Tech is a focused workflow account, not a lower organizational level.
- Techs need read-only inventory and Outbound context to understand material headed to project sites.
- Techs still do not perform Receiving, yard Movement, Outbound control actions, Procurement, supplier/cost work, reports/exports, configuration, or account administration.
- Richardson Office & Warehouse is a current Site with a small indoor warehouse and receiving area. It must participate in all future Site-aware Procurement, Receiving, reporting, Project Hub, delivery, and installation workflows.
- TBS Material Name is the primary operational/common name. Procurement and Receiving must preserve a separate Supplier Material Description and supplier item/reference when available.

## Phase effects

### Phase 11 — Procurement foundation

Purchase Request Lines record both the TBS Material Name and optional Supplier Material Description. Search and operational displays lead with the TBS name; supplier documents retain the supplier wording.

### Phase 13 — Procurement and Receiving integration

Matching a PO Line to a Receipt Line must not rename existing TBS material. The match preserves both names and shows discrepancies without destroying either source.

### Phase 15 — Operations Project Hub

Operators see all projects and Sites. Tech views become assignment-focused while retaining the read-only inventory and Outbound context required for their assigned work.

### Phase 16 — Deliveries and material pickup

Techs see the selected material, its source Site, destination project, handling requirements, and handoff state. They cannot substitute or mutate unrelated inventory.

### Phase 17 — Field installation

The existing My Work surface becomes a durable installation workflow. A confirmation records assigned project, delivered material, installed quantity, Tech identity, UTC time, notes, optional completion photos, and a linked Issue for blocked, damaged, missing, or incorrect material.

## Acceptance additions

- Site filters include Lavon and Richardson without mixing their Storage Locations.
- Operator language never implies a yard-only role or company hierarchy.
- Tech navigation exposes only the focused My Work experience and personal settings.
- Tech inventory/Outbound access is read-only at UI, Route Handler, command, and RLS boundaries.
- TBS and supplier material names remain distinct through request, PO, Receipt, inventory, Outbound, and installation records.
