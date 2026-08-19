# Temporary Demo Account Setup v2

This guide supersedes `demo-setup-guide-v1.md` for the current Operator/Tech demonstration. The earlier file remains implementation history.

1. Create email/password identities in Supabase Authentication with public signup disabled.
2. Open TBS Operations with an active Operator account.
3. In **Administration → Account access**, set a display name, choose Operator or Tech, activate the profile, and save.
4. Use at least one Operator for all operational/admin-control workflows and one Tech for My Work acceptance.
5. Do not expose service-role credentials in the browser or Vercel public variables.
6. Keep operational media private and confirm photos cannot be opened while signed out.

Operator accounts have all operational access. Tech accounts have read-only Inventory Search plus assigned installation work. A Tech does not need a Site Membership to perform an assigned field command; the command validates the assignment's authenticated Tech ID. Tech Inventory access remains read-only at UI, Route Handler, database function, and RLS boundaries.

Before a demo, verify:

- Operator assigns a Ready or Departed batch to the Tech.
- Tech starts and confirms work on phone and desktop.
- Installed, partial, blocked, and Damaged-with-photo behavior.
- Offline confirmation and photo replay once after reconnect.
- Tech direct access to Receiving, Movement, Outbound control, Reports export, and Administration remains denied.
- The deployed Vercel commit includes the field-work migration and the migration is applied to the temporary Supabase project.
