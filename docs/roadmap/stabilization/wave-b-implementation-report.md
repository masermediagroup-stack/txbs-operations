# Stabilization implementation — Wave B

Updated 2026-09-11. In progress; not production acceptance.

## Implemented so far

- Online inventory/field and queued photos now use a shared direct-to-Storage transport. Only metadata crosses the application upload endpoint. Transfers report progress and retry under the same upload identity, verifying an existing object after a lost response rather than overwriting it.
- Media downloads use a short-lived signed URL authorized by the caller's Storage RLS. Full image responses no longer pass through the application function.
- Image type/size and file signatures are checked; server attestation also checks the actual uploaded signature, size and checksum.
- An additive installation migration removes SQL result-name ambiguity, requires outbound departure, enforces complete unique line submission and cumulative quantities, and rejects Installed when known quantities remain. Unknown quantities require explicit acknowledgement. Blocked requires a linked Issue.
- The installation form uses remaining quantities, includes locally queued confirmations, defaults partial/blocked quantities to zero, and disables confirmation before departure.
- All 22 inventory snapshot reads now paginate with a unique ordering key. The reader advances by actual returned row count so a lower server row cap cannot silently truncate the result.
- Desktop global search uses bounded authorized database queries online and the current account's stored records offline. It includes loading/error/empty states, semantic result links and keyboard navigation.

## Verification

- Direct-transfer tests cover 6 MiB payloads, small metadata requests, an interrupted response without duplicate byte upload, and rejected image types/sizes.
- Real PostgreSQL tests cover repeated partial installation, cumulative over-installation, premature completion, duplicate command replay, confirmation before departure, duplicate/missing lines, missing versions, Blocked without an Issue, and unknown-quantity acknowledgement.
- Lint, TypeScript, production build and 89 tests pass. The full 96-test browser suite passed before the final search change. After that change, 25 shell checks passed and three search fixture races were corrected; all four new-record/keyboard search checks then passed. Hosted byte transfers and physical-device acceptance remain outstanding.

## Not yet implemented

- Explicit source-site handling across outbound, receiving and Add Material.
- Pagination for other read paths, consistent revisions and bounded workflow read models; representative database scale benchmark. The inventory reader's 10,017-row test is a completeness test, not a production performance benchmark.
- Notification leases, retry recovery and scheduled worker.
- Shared backup capability gating and database/media restore drill.
- Receipt-line lineage and related migration/type updates.

No changes have been deployed or permanently migrated to the temporary Supabase project. Earlier hosted role checks used rollback-only transactions. Existing evidence has not been deleted.
