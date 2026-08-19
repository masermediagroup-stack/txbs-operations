# Phase 6 Operator/Tech Access Closeout v2

- Report date: 2026-08-19
- Status: Current demonstration access model
- Supersedes for current role guidance: `implementation-report-v1.md`

## User-facing account types

- **Operator** is broad trusted-business access for office staff, leadership, material management, yard, and warehouse users. Operators receive current operational, reporting, account, and configuration access.
- **Tech** is focused field access. Techs receive assigned installation work plus read-only Inventory and relevant Outbound context. They do not perform Receiving, yard Movement, Procurement, reporting export, or account administration.

Operator and Tech are access scopes, not company rank, title, or work location. Manager and Administrator are retired user-facing names. Legacy values remain only for immutable database compatibility and are interpreted as Operator by current adapters.

## Demonstration environment

- Supabase email/password accounts remain temporary and public signup stays disabled.
- Microsoft Entra ID, company-approved infrastructure, SMTP recovery, and permanent data cutover remain production gates.
- Operators configure active Operator and Tech profiles through the protected Administration surface.
- Auth, Route Handlers, commands, RLS, private Storage, and offline replay must enforce the same access scope; hidden navigation is never the security boundary.

## Current acceptance

- Operator access works across desktop and mobile.
- Movement data synchronizes across devices.
- Private photos remain protected.
- Offline commands replay successfully.
- Temporary data is explicitly documented and is not silently promoted to production.

## Remaining field-work extension

The Tech My Work surface is being extended with durable assignment and installation confirmation. That extension preserves the two-account model rather than introducing another role.
