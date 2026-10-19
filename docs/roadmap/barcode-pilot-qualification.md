# Synthetic barcode pilot qualification procedure

Supporting evidence procedure for Master Plan Q-03 and Q-01, 2026-10-19.
This is not another active plan, a purchase instruction or a production release.
Internal handling-unit identifiers are approved for the first pilot; final token
format, device, media and print route still need acceptance. Optional phone-camera
scope remains a separate decision. No original iPhone export is required here.

## Prepare the software bench

Open `scripts/fixtures/barcode-scanner-bench.html` in a supported desktop browser.
It is a single-file synthetic page, including the pinned MIT generator, with no
account, API, inventory connection or persistent observation storage. Keep the
page and its license together. The desktop rehearsal and digital round-trip
results are recorded in [the October 19 report](../research/barcode-digital-roundtrip-2026-10-19.md).

The normal application at laptop `localhost` and the synthetic bench are different
tools. A handheld's `localhost` means that handheld, not the laptop. For delivery
testing, use an explicitly approved test origin reachable from the device or a
manufacturer-supported local-file path. The current loopback-only desktop server
does not establish handheld access. An installed/offline application later needs
its accepted secure-origin and asset preparation flow; this static bench does not
accept those capabilities.

The integrated handheld sends already decoded text through its supported browser
keystroke profile. Its Wi-Fi carries the Android browser's HTTPS requests to the
cloud application through the local router. The first pilot does not need ZBar
between the scan engine and browser, a PC acting as a permanent gateway, or an
inbound port to the warehouse network. Camera and offline/cloud command paths
retain their separate qualification. A decoded beep is not server confirmation.

## Record equipment before interpreting results

Record exact handheld make, orderable SKU, scan engine option, serial/asset ID in
private evidence, firmware, Android version/security-patch date, browser version,
keyboard language, vendor-wedge app/profile revision, Code 128 enablement, prefix,
suffix and sleep behavior. Use the vendor's supported profile. A Zebra scan engine
inside another manufacturer's terminal does not establish DataWedge compatibility.

Record the printer SKU, actual DPI, connection, driver/print route, stock dimensions,
material/adhesive, ribbon if applicable, scaling and orientation. Preserve each
printed sample and its fixture/profile ID. A generic office-paper rehearsal can
test text capture; it cannot accept thermal-label media or stock durability.
Quotes, returns, security support, budget and purchase authorization stay separate.

## Rehearse capture without stock actions

| Case | Input/action | Expected observation |
| --- | --- | --- |
| BC-01 | Focus field; type `TESTHU-00A17B29`; Enter | Active fixture, two lines, explicitly unknown quantities; zero mutations |
| BC-02 | Read the active printed label through the handheld trigger | Exact same token and active context on its screen |
| BC-03 | Read `TESTHU-00C23D45` | Retired status; no successor selection or stock action |
| BC-04 | Enter `TESTHU-00000000` | Unknown fixture; no record creation |
| BC-05 | Lowercase, leading space, URL or concatenated identifiers | Invalid input; exact captured text remains inspectable |
| BC-06 | Repeat active scans | Visible repeated lookup feedback; zero mutations |
| BC-07 | Move focus to another control, then trigger | Readiness says not ready; no stock action; refocus explicitly |
| BC-08 | Use manual lookup and the on-screen keyboard | Manual path usable; no automatic confirmation from Enter |
| BC-09 | Sleep/wake, browser background/foreground and reconnect | Record actual input/focus behavior; do not infer a pass |

The bench supports lookup only. It has no receiving/movement/checkout command to
accept. Q-02 later tests authentication, assignment, explicit confirmation,
authorization, stale/duplicate commands and independent device visibility. Its
offline slice separately tests preparation, reload, retained work/photos, account
boundaries, expired sessions, conflicts and exact-once replay on the actual host.
The old environment remains held under A-08R until recovery or verified isolation.

## Measure prints and reading distance

Use the calibration sheet supplied with the local pilot kit at 100%/actual size,
with fit/shrink and browser headers/footers disabled. Measure its 25.4 mm reference
and each complete symbol width including white space. Stop interpreting the
nominal DPI profile if the measured scale differs. Do not crop the quiet zones,
stretch the bitmap or call a generated/submitted print job physically successful.

The sheet offers nominal 203-DPI two/three-dot and 300-DPI three-dot examples. It
does not select a printer or media. The final token may be longer than these bench
identifiers; repeat the experiment with the longest/widest approved identity.

For initial screening, record 20 separate trigger attempts per candidate print
profile at measured distances of about 1, 3 and 6 feet. Record actual distances,
lighting/glare, label orientation/condition, successes/attempts, wrong text, time to
read and any retries. Keep original results; never substitute a nearer successful
read for a failed far-distance attempt. The repeated-attempt count is an engineering
screening procedure, not an agreed production reliability or throughput threshold.
One wrong identity fails that case; unresolved misses or distance gaps remain open.

Record gloves, typical working posture, available screen/keyboard space and visible
confirmation. Final throughput, charging/shift duration, Wi-Fi handoff/gaps and label
wear/exposure must match the agreed warehouse workflow. Indoor scanner scope is
settled; label use after dispatch still needs its own exposure decision if included.
All these physical observations are currently **not run**.

## Evidence and outcome

Use a CSV or the local pilot kit's results form with the equipment/profile IDs,
fixture/label dimensions, cases, expected/actual values, attempts, failures and
reviewer/date. Keep device serials, Wi-Fi details and business data private; public
tickets receive only synthetic technical results. A renderer/decoder pass is
separate from handheld input, physical print, read range, cloud command acceptance
and actual operational readiness. Update the relevant existing Master Plan IDs
and tickets without closing the whole task from one successful test.
