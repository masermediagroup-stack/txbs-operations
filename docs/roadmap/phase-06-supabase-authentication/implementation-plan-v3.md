# Phase 6 — Operator and Tech Access Model v3

## Decision update

This version corrects the account meaning established in v2 while preserving v1 and v2 as decision history.

- `Operator` is a broad trusted-business access scope, not a yard job title or rank. It can represent office staff, company leadership, material/warehouse management, yard staff, or another person who needs the complete operational picture.
- `Tech` is a focused field-work access scope. The narrower interface exists because Techs need a subset of workflows and information, not because the accounts form an organizational hierarchy.
- Techs need read-only inventory visibility, Outbound handoff visibility, and a future durable Installation Confirmation workflow.
- Techs do not perform Receiving, Material Movement, Outbound control actions, Procurement, cost/supplier work, reporting exports, configuration, or account administration.

## Current implementation scope

- Add `/my-work` as the Tech landing workspace.
- Show read-only present inventory with project, TBS Material Name, quantity, Site, and Storage Location.
- Show Planned, Ready, and Departed Outbound context.
- Show a clearly labeled planned Installation Confirmation area without pretending a durable installation command already exists.
- Permit active Tech accounts to read operational inventory rows through RLS.
- Keep Techs without Site Membership records so the existing inventory command function rejects Tech mutations at the database boundary.
- Continue denying Tech access to inventory command and upload Route Handlers.

## Security and rollback

RLS remains enabled. Tech authorization is based on the trusted Profile role, not user-editable metadata. Operator command authority remains membership-backed for the existing command function. Rolling back the application hides `/my-work`; rolling back the database function removes Tech read visibility without deleting operational records.

## Acceptance

- An Operator sees all current modules and account administration regardless of their physical workplace or business title.
- A Tech can load My Work on desktop and mobile and see inventory and Outbound context for Lavon and Richardson.
- A Tech receives `403` from inventory command and upload endpoints and cannot create or change operational records.
- Tech navigation does not expose Procurement, Reports, Administration, Receiving, Movement, or Outbound-control surfaces.
