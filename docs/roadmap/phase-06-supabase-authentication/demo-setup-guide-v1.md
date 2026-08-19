# Phase 6 Demo Setup Guide v1

> **Historical setup guide.** Superseded by [demo setup guide v2](demo-setup-guide-v2.md).

## What is already configured

- The temporary Supabase project contains the Phase 6 schema, RLS, private operational-media Storage, shared command functions, Lavon Yard, ten confirmed storage locations, and the current 18-project/36-lot baseline.
- The web application authenticates with Supabase password accounts and uses the shared database for online Inventory reads and commands.
- Offline work remains in IndexedDB and replays through the authenticated command endpoint when the device reconnects.
- The application never needs a Supabase secret/service-role key at runtime.

## Create the Operator demo identity

In Supabase Dashboard, open **Authentication → Users → Add user**. Create one account with a temporary password for the yard Operator.

Do not create separate Manager, additional Administrator, or no-access demo accounts at this stage. The role model remains implemented for later use, but the temporary human account inventory is intentionally limited.

Do not enable public signup. Do not share passwords in source control, Vercel variables, screenshots, or this document.

The newly created account appears inactive in **TBS Operations → Administration**. Sign in as the existing bootstrap Administrator, open Administration, then:

- Activate the Operator and assign `Operator` at `Lavon Yard`.
- Use the existing Administrator only for temporary setup and maintenance.
- Validate Manager, Administrator, inactive-profile, and no-membership policy states through automated database tests until additional company accounts are intentionally provisioned.

## Vercel variables

Set these for the dedicated temporary Vercel project's Production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `APP_ENVIRONMENT=temporary`
- `INVENTORY_DATA_BACKEND=supabase`

The publishable key is intentionally browser-visible and is protected by Auth, grants, and RLS. Never add a Supabase secret key, service-role key, database password, or test-user password to browser variables.

Redeploy after changing Vercel variables. Use the stable Vercel HTTPS URL on desktop and mobile so camera and PWA features are available.

## Auth settings for the demo

- Email/password provider: enabled.
- Public signup: disabled.
- Site URL: stable temporary Vercel HTTPS origin.
- Redirect URL: stable origin plus `/login` and any later password-recovery callback route.
- Microsoft Entra: deferred until the company supplies the tenant/app access.
- Custom SMTP: recommended before relying on password-recovery email. Until then, an Administrator can set a new temporary password in Supabase Dashboard.
- Leaked-password protection: enable when available on the selected Supabase plan.

## Field validation

1. Sign in with the Operator account on both a phone and desktop browser.
2. Receive a test shipment with one material photo per line; refresh the other device and confirm it appears there.
3. Move a lot without a photo; confirm movement detail, lot lineage, and Activity.
4. Record a Damaged Issue with a photo and confirm the evidence is available from the other device. Privileged resolution testing is deferred to automated policy coverage until a Manager account is intentionally added.
5. Plan and process the Operator-authorized outbound steps; verify the resulting lot quantities from the other device. Manager-only approval remains deferred.
6. Disable connectivity, perform a verification or movement, reconnect, press Sync, and verify replay.
7. Attempt a stale action from the other device and confirm it appears in the conflict inbox.
8. Confirm private photos cannot be opened outside an authorized session; automated policy tests cover no-membership and wrong-site denial.

## Later company cutover

The future production cutover creates a fresh company-approved database, storage bucket, and identity provider. Apply the repository migrations, import a verified backup, validate count/media parity, switch environment variables/adapters, and only then retire this disposable demo project. Demo data is not silently promoted.
