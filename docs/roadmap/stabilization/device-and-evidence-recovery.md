# Device recovery and evidence retention

## Current account recovery

Open Yard sync and export the recovery journal before any explicit discard. The export includes original command payloads, dependencies, expected versions and photo bytes, including conflicted commands. Compare with the shared record while online. Retry retains the original expected version; it does not silently overwrite shared changes. Resolve physical discrepancies before recording a replacement action.

Do not clear browser storage to resolve a conflict. Account switching locks other accounts' scoped data. Sign in as the original account in the original environment to resume that account's journal.

## Chisum field-test recovery (A-08R)

October 16 scope decision: the user withdrew further iPhone testing in favor of
the primary Android barcode handheld. A-08 physical iPhone acceptance is deferred,
not passed. The user reported saving an export and discarding the action, but later
said the export was probably still on the phone. Archive/photo and full-relaunch
evidence remain unverified. Do not request further phone recovery as a prerequisite
for synthetic scanner bench work. The existing environment's replay hold remains.

### Retired-device isolation alternative — prepared, not executed

If the phone is retired from the pilot, use a reviewed isolation route rather than
claiming that its queue was proven empty. Keep the old validation deployment/backend
held and preserve any known archive in place. Record the missing recovery evidence;
do not clear phone storage, delete the old dataset or mark its photo recovered.

A fresh Android pilot would need a distinct application origin and backend/Auth
project, freshly generated project credentials and test identities, and synthetic
records. Configure shared mode with the new backend explicitly; the old demo
fallback must not select the held project. Do not import old browser storage,
journals, identifiers, production stock or source documents. Barcode hardware by
itself does not provide this separation.

Before accepting isolation, prove the actual deployed API/backend configuration,
account/environment journal scope, rejection of the wrong project's credentials
and old command ownership, absence of queue adoption, and continued hold in the
old environment. Repeat applicable hosted authorization/evidence checks for the
new environment; previous-project results do not prove new-project access controls.
Then qualify the actual Android device and exactly-once replay using disposable
fixtures. Keep operational use behind the warehouse and production gates.

This is a reviewable procedure, not a provisioned environment or permission to
create paid resources. Confirm account capacity, cost, ownership and environment
configuration before provisioning. A-08R remains open until one route is verified.

### Original recovery route — retained reference

Keep the Production replay hold enabled while using the original iPhone and its original app profile. Export the recovery journal and confirm the downloaded JSON, including its photo, is preserved in approved company storage before explicitly discarding the Chisum Move material action. A successful download prompt alone does not prove that the archive was saved. Confirm Yard sync has no local-only action or photo after discard and after a full close and reopen.

Use the `clientMutationId` of the Chisum `movement.create` entry from the preserved journal in [`scripts/verify-chisum-recovery.sql`](../../../scripts/verify-chisum-recovery.sql). Run that read-only query with privileged access in the temporary Supabase project. The query checks the command receipt and audit, movement, staged and verified upload, photo, and Storage object associated with the command, plus all Chisum movements since the field test. It also lists the current Chisum lots for comparison with the 2026-09-24 baseline. Require one matching project, the original two lots with their baseline IDs, locations, quantities, and versions, and zero residue counts before releasing the hold. Investigate any mismatch; a zero database result alone does not prove the original phone queue was cleared or the journal was archived.

## Earlier app versions

The databases `tbs-operations-inventory` and `tbs-operations-mobile` remain untouched. Yard sync reports their presence where the browser supports database enumeration. An empty current-account journal does not establish that these older databases are empty.

Before migrating legacy work, an administrator must preserve the browser profile and verify each command's original actor and environment against the authoritative account and command history. Preserve an encrypted copy in approved company storage. Do not send raw archives containing operational photos through unapproved channels.

Use this recovery sequence:

1. Preserve the browser profile and both legacy databases before opening or clearing them. Record the device custodian and collection time.
2. Create an encrypted archive in approved company storage. Record its approved storage reference and checksum outside the raw archive.
3. Record each entry's source database, original actor UUID, original environment host/scope, client mutation UUID, expected record versions, and evidence checksum and byte size. Do not infer missing values.
4. Query the authoritative command receipt using the original command UUID. An exact actor/environment receipt means the action is already recorded and must not be replayed. A mismatched receipt remains quarantined.
5. Run the read-only legacy recovery assessment represented by `assessLegacyRecovery`. Only `eligible-for-manual-recovery` may proceed to explicit administrator review. `already-recorded` and `quarantined` entries never replay.
6. Compare eligible entries with the current authorized record and reconcile any physical quantity, location, or evidence ambiguity. Automatic adoption remains unavailable; no current application flow imports a legacy database.
7. After an approved migration tool exists, validate the resulting command receipt, record, evidence link, and audit entry before closing the recovery case. Keep the encrypted archive until the approved retention policy permits disposal.

Entries with missing actor/environment identity, invalid command IDs, missing evidence or ambiguous expected versions remain quarantined. Do not generate a fresh ID and replay an uncertain historical action: it may duplicate an already completed physical operation. Synthetic acceptance covers intact quarantine, actor/environment attribution, command-receipt comparison, ambiguous evidence, and encrypted archival. The 2026-09-11 confirmation that no real unsynced records or photos require recovery means no live migration is part of Wave A.

## Privileged evidence retention

Ordinary Operators and Techs cannot replace or delete operational evidence. Retention is separate maintenance requiring the server secret, approval from an active Operator, a specific recorded reason, and an explicit execution flag. There is no automatic expiry or bulk deletion.

Before approving deletion, verify company retention requirements, any legal hold, linked operational records and the recoverable database/media backup. This implementation does not invent a company retention period. Evidence record relationships remain in the database after byte deletion.

Use `scripts/delete-evidence-with-audit.mjs` first without `--execute` to preview the exact object path, approver UUID and reason. Supply `SUPABASE_URL` and `SUPABASE_SECRET_KEY` only in the maintenance process environment. With `--execute`, the script records a Requested event, deletes through the Storage API, and records Deleted or Failed. It never deletes directly from `storage.objects`.

The private event log retains the object metadata, linked photo IDs, staged checksums, approver, reason and timestamps. Client accounts cannot invoke retention functions; even the service role cannot update or delete audit rows directly. A Deleted event is rejected while the object still exists.

If the process stops after deletion but before completion, inspect the existing request and object before doing anything else. Reconcile that request with `finish_evidence_retention`; do not blindly repeat a destructive operation. Unfinished Requested events require investigation. The script has not been used to delete any shared evidence during stabilization.
