# Stabilization implementation — Wave A

Updated 2026-09-28. The sections below retain the 2026-09-14 implementation checkpoint. Current hosted and device status is tracked by stable task ID in root [`TODO.md`](../../../TODO.md); physical-device acceptance and the replay-hold recovery remain open. This is not production acceptance.

**Wave A is the sole active implementation priority.** Further Wave B–D work is paused until this wave's exit gate is completed and reported. Current closeout tasks are `A-01` through `A-10` in root [`TODO.md`](../../../TODO.md).

## Implemented

- Account/environment-scoped IndexedDB, original-actor and active-session checks, and a visible quarantine notice for preserved legacy databases.
- Atomic inventory projection, command and photo writes. Unreadable evidence and stale writes roll back. Shared-cache refresh cannot replace pending local projections, including reload before journal hydration.
- Conflict payload/photo retention, locked recovery export, current authorized record comparison, original-version retry and dependent-aware explicit discard.
- Cross-tab replay serialization, explicit dependencies, created-record ID mapping preserved through schema validation and acknowledgment, and refresh after replay.
- Per-account Tech-work cache and pending assignment version projection.
- Safe return URLs, explicit environment/test modes, loopback-only bypass, JSON API authentication errors, static public offline fallback, and old shell-cache cleanup at sign-in and in authenticated pages.
- Nonce-based CSP support and baseline headers; CSV formula neutralization; dependency updates; shadcn moved to development dependencies.
- Additive active-account field RLS, immutable operational objects, and service-only byte attestation before evidence consumption.
- Separate privileged evidence retention: preview-first maintenance script and append-only Requested/Deleted/Failed audit events. Ordinary Operators retain business access but cannot invoke evidence destruction.
- Both browser engines installed in CI, failure traces retained, and stale browser assertions corrected.

## Verification

- Lint and TypeScript pass; **80 tests across 13 files pass**, including PostgreSQL security/retention and IndexedDB transaction tests.
- Production build with enforced CSP passes. Authenticated pages render dynamically; `/offline` remains static.
- The full browser run on 2026-09-11 passed **96/96 across all four browser targets**. Earlier static-page cleanup and ambiguous assertion failures are corrected. Subsequent Wave B search changes have separate regression validation.
- Windows Playwright WebKit's network-offline emulator rejected even in-memory Blob reads during diagnosis. Its positive offline-photo test now blocks HTTP requests and dispatches offline state without disabling Blob reads; it verifies network fetches fail. Physical Safari behavior remains unverified. Unreadable photo bytes separately leave no partial local write in tests.
- The access/evidence migration passed rollback-only hosted tests in the user-designated temporary Supabase project: Operator/assigned Tech access, unrelated/inactive Tech denial, anonymous denial and restricted attestation privileges. Follow-up inspection confirmed zero retained fixture users and no persisted test policies/table. This does not exercise the hosted Storage API.
- Dependency audit previously reported zero vulnerabilities after updates.
- Retention preview ran without credentials or deletion. PostgreSQL tests prove client denial, audit retention and rejection of a false Deleted result while the object exists.
- The live Supabase security advisor was rerun on 2026-09-14. It reports disabled leaked-password protection and eight authenticated-callable `SECURITY DEFINER` functions. Several are designed as authenticated application endpoints and contain active-role checks, but the warning is not closed until direct denial tests prove each boundary and worker-only functions are narrowed where appropriate.

## Remaining acceptance and deployment requirements

- No migration or deployment has been permanently applied. Evidence migrations and server-only `SUPABASE_SECRET_KEY` must be configured together with matching server code.
- Validate hosted signed uploads, checksum mismatch and denial of overwriting consumed evidence with the completed photo transport. These overlap Wave B's direct-storage work.
- Start CSP report-only in the validation deployment and inspect violations before enforcement. Leaked-password protection and Microsoft Entra acceptance remain rollout checks.
- The user reported a successful initial physical-iPhone smoke check on 2026-09-11. Complete the focused installed-app matrix and Android field check; a general smoke result does not establish account-isolation, expired-session, offline-reload or queued-update acceptance.
- Legacy data with unverified ownership/environment remains quarantined. The user confirmed no real unsynced records or photos exist, so no live recovery is required for Wave A. Retain synthetic non-discard tests and follow `device-and-evidence-recovery.md` if any legacy work is later discovered.
- Retention requires approved company policy and case-specific approval; no automatic expiry is invented. No shared evidence has been deleted.
- Historical Richardson demo migrations assume separately imported Ramer/Plano projects. Test fixtures explicitly represent that prerequisite. Reconcile applied history without rewriting it.

Wave B is paused with existing changes preserved. Its already implemented direct-photo transport may be used only as needed to complete Wave A hosted evidence acceptance. Microsoft Entra remains required before production, but the approved temporary validation exception allows administratively created Supabase password accounts while Entra is deferred.

## 2026-09-28 local regression checkpoint for A-10

- **Behavior and interfaces:** Pinned `next` and `eslint-config-next` to `16.3.6` after the dependency audit identified a critical Next.js advisory; `npm audit fix` updated vulnerable transitive packages without changing application data or API contracts. The Reports browser test now targets the report searchbox by its exact accessible name. The private photo gallery positions the link wrapping its fill image, as required by the bundled Next.js Image documentation. No migration was added.
- **Validation:** Full ESLint, strict TypeScript, and 106 unit/database tests passed. The production build passed with Next.js 16.3.6 using a fresh ignored `NEXT_DIST_DIR` because a prior `.next` build artifact was read-only under OneDrive. `npm audit fix` reported zero vulnerabilities. The first browser run had 97/108 passes with seven workers; nine of the 11 failed cases passed with two workers, and the two repeatable Reports failures were resolved by the exact searchbox locator. The complete desktop/mobile Chromium and WebKit run then passed 108/108 with two workers. After the photo positioning fix, focused lint, strict TypeScript, and the damaged-Issue evidence case passed in all four browser targets (4/4), with no fill-parent warning in that run.
- **Remaining gates and rollback:** This checkpoint has not been deployed. `A-08R` must recover and discard the accidental Chisum queue, verify zero residue, and release the hosted replay hold. `A-08` iPhone acceptance and `A-09` Android acceptance or an approved exception remain before `A-10` can close. Revert the two dependency pins and lockfile together if the upgrade must be rolled back; no database rollback is involved. The historical hosted build identity in `A-01` remains separate from this local commit.

## 2026-09-28 local recovery-flow check for A-08R

The existing offline Movement browser scenario now downloads the recovery journal before discard, reads the downloaded JSON, and verifies its queued command and exact photo bytes. It then accepts the explicit discard, verifies no local-only action or photo notice remains, reloads, and verifies the queue stays empty. Desktop/mobile Chromium and WebKit passed 4/4. This adds no API or migration; revert the test change if needed. The emulated browsers do not prove an export from the original iPhone or that its archive reached approved company storage. The device, shared-record residue checks, replay-hold release, and disposable fixture remain open under `A-08R`.
