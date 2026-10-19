# Barcode labeling and scan-to-action contract

Supporting Q-01 through Q-04 in the **TBS Operations Master Plan**, updated 2026-10-19. The user requested barcode labeling in place of the planned QR output and confirmed handling-unit identification followed by explicit worker-confirmed actions. This is a specification and research checkpoint, not implemented scanner support or hardware acceptance.

Read the cited [hardware/connectivity research](../research/barcode-scanner-connectivity-2026-10-15.md) and [software/symbology research](../research/barcode-software-and-symbology-2026-10-15.md). Facts about vendor products are evidence; the TBS design below is a proposal except where explicitly accepted. No scanner, printer, decoder or label stock has been purchased or selected.

## Settled scope and open choices

- Replace QR as the required TBS handling-unit label output with linear barcode labeling. Preserve stable Q-series task IDs and existing manual, authorization, custody, quantity and replay requirements.
- Identify a physical box, pallet or bundle. Several product content lines for one outbound job can share a unit; scanning never supplies their quantities or implies a receipt, departure, arrival or installation.
- A scan opens context. A worker chooses and confirms an authorized action. Manual lookup uses the same workflow.
- Code 128 with a compact opaque token is the recommended pilot candidate, pending Q-03 format/width/device acceptance. The user confirmed on October 19 that the first pilot uses internal identifiers; supplier/customer GS1-128/SSCC requirements are separate. The final namespace/version/alphabet/length remains open. Buying a 2D-capable reader does not require printing QR labels.
- **Device direction confirmed on October 15:** The primary device must have its own screen and integrated barcode scanner, with Android the preferred platform; a separate phone is not required for normal scanning. Phone use remains an optional secondary/fallback path. Exact model, OS/browser version, vendor input profile and physical acceptance remain open. Use a manufacturer-supported scanner-to-browser input path (for example, DataWedge on compatible Zebra devices); do not assume every Android scanner includes the same software. The worker must see the unit, enter required details and confirm the result on the handheld itself.
- **Pilot requirements confirmed on October 15:** qualify one handheld first, with labels readable at approximately 1–6 feet. The hardware budget including charger/cradle is recorded privately; printer and label costs are separate. This is a required test envelope, not verified read-range capability. Qualify the actual token length, symbology, module size, label width and conditions at the near/far distances; a generic standard-range claim or a Code 39 example does not prove Code 128 performance.
- **Operating environment confirmed:** primary scanner use is inside an enclosed warehouse. Outdoor yard-scanner qualification is not a first-pilot requirement. Indoor dust/handling, glare, gloves, throughput, label adhesion/abrasion and actual warehouse layout still need qualification. Post-dispatch label exposure remains separate if a label is used at a jobsite. Desk scanners remain alternatives rather than the primary pilot. Optional phone-camera or Bluetooth coverage requires its own compatibility evidence and does not block qualification of the primary handheld.

## Connection paths

| Path | Scanner-to-host connection | How the cloud receives work | Acceptance requirement |
| --- | --- | --- | --- |
| Fixed desk | USB HID keyboard scanner, or cordless scanner's USB base | Signed-in browser uses the host's network and HTTPS | Exact cable/base, chosen host OS/browser, keyboard layout and suffix |
| Phone/tablet | Compatible Bluetooth HID scanner | Signed-in app uses phone/tablet Wi-Fi or cellular Internet | Actual scanner/OS pairing, reconnect, input focus and onscreen keyboard |
| Industrial handheld | Integrated imager and approved browser keystroke profile on Wi-Fi-capable Android computer | The handheld runs the app and submits its confirmed commands | Exact device/browser/DataWedge profile and supported OS lifecycle |
| Camera fallback | Camera frames decoded locally by an approved browser decoder | The same text resolver and commands | HTTPS, permission, browser/format support, measured device performance and package/license acceptance |
| Headless network scanner | Model-specific Ethernet/Wi-Fi protocol | Requires a separately designed authenticated receiver/gateway when it cannot run the app | Deferred unless needed; raw TCP/UDP is not the application's HTTPS command API |

A cordless or “2.4 GHz” product is not necessarily Wi-Fi. Neither Bluetooth pairing nor a successful decode establishes a cloud session. Cloud use does not require the user's devices to share one LAN: the authenticated host needs outbound Internet access. A local router with no WAN does not make the cloud reachable; prepared offline operation remains separate. Do not put service credentials into a scanner, open public inbound ports, or expose the development laptop to implement this flow.

`localhost` identifies the device running the browser. Another phone cannot use the laptop's localhost URL as its own local server. A phone opening a plain LAN HTTP address does not inherit the localhost camera security exception. Physical camera testing needs an approved trusted HTTPS origin. The existing local dev server is not a field deployment.

## Barcode identity and input contract

Q-03 must settle token namespace/version, alphabet, length, human-readable form and collision handling using actual label width and scan-distance measurements. Keep the printed token separate from the internal UUID if needed to keep a linear symbol short. It contains no project/vendor/person details, quantities, prices, credentials or access grants. Publicly visible identity never grants access.

Handle a label instance and the stable unit identity separately where reissue/retirement requires it. Q-04 must settle exact token reuse/rotation and multiple-face copy rules before production printing. A reprint cannot create stock; a split/repack cannot leave a stale label actionable against old quantities. Preserve traceable historical resolution and show retirement/successor context only to authorized users. Supplier/product/tracking barcodes stay typed external references and never automatically resolve as TBS units.

All approved input paths yield the same bounded identifier string. A dedicated scan field/session handles keyboard events, direct input/paste and supported IME behavior; do not depend solely on keystroke timing to recognize a scanner. Only documented transport framing may be removed. Preserve case/zeros and reject malformed, oversized, wrong-namespace and unexpected control-character payloads. Never execute decoded URLs, commands or printer language. A configured Enter suffix requests lookup only; it cannot submit a stock-changing confirmation. Loss of focus, scan into another form, duplicate bursts, partial frames and reconnects must fail visibly and safely.

The resolver distinguishes captured input, a resolved authorized unit, and a confirmed business command. Unknown/unauthorized units have non-leaking outcomes. Retired/split units cannot silently substitute a successor. Manual entry, HID and any camera/native adapter share resolution and command semantics.

## Cloud and offline behavior

The authenticated app resolves identity and shows current unit contents, physical Site/location and permitted work. Existing roles and assignment rules apply. Worker confirmation submits the existing versioned command with actor, actual participants, product quantities/UOM, package context, destination where relevant, original revision and idempotency identity. Server authorization and stale-version checks still apply. Only a successful command result is cloud confirmation; another authorized device must see the committed result.

A scanner beep, a Bluetooth transmit acknowledgment, a buffered barcode and a queued offline command are four different facts. None establishes physical custody or server acceptance. Camera-frame debounce is an input convenience, not mutation deduplication. Preserve unknown quantities and original receipt/material lineage.

Offline work resolves only previously prepared permitted mappings/records under the existing account/environment scope. Unknown/unprepared scans remain unresolved. Queue worker-confirmed actions and evidence with pending status; revalidate session, role, assignment and revision on replay. Preserve recovery/export/retry/discard and dependent-command holds. Do not replay scanner batch memory as automatic historical movements or invent physical action times. Repeated delivery of one command produces one business effect; separate confirmed actions retain separate identities. PO approval, issuance, release and cost changes remain online-only.

## Generation, printing and lifecycle

Generation and decoding are different functions. bwip-js and JsBarcode are generator candidates; ZBar is an optional image-decoder candidate. HID requires neither an image-decoding library nor browser Bluetooth pairing APIs. Select and pin only the components the approved paths need. Review licenses, transitive notices, embedded native version, vulnerability/maintenance evidence, bundle cost and offline/CSP behavior. Native BarcodeDetector alone is not an accepted cross-browser camera solution.

Q-04 produces a previewable, system-owned printable output using synthetic fixtures first. Authorize label issuance, retain template/version/unit identity and print/reprint/void history, and use stable print-job identities to distinguish retry from a deliberate extra copy. Generated PDF/SVG or an OS print-dialog handoff is not proof that a physical label printed. Represent requested/generated/submitted/physically verified states honestly; handle wrong printer/stock, cancellation, spool failure, lost response and abandoned jobs.

Preserve symbology quiet zones and integer printer-dot sizing; prohibit arbitrary bitmap stretching and “fit to page” acceptance without measured output. Set human-readable content, visible job/material wording if permitted, stock dimensions and DPI only after the pilot. Barcode payload and visible label text have separate information policies. Changing printed descriptive text does not mutate the stable unit identity.

Start by evaluating PDF/OS print workflow at an approved station. BrowserPrint, a local bridge, raw printer language or vendor-cloud printing requires a separate accepted platform/security/operations design. A cloud server cannot automatically reach a private LAN printer. Do not assume Safari can send raw ZPL or that network reachability grants print authorization. Outdoor stock/material/adhesive/ribbon and cleaning/durability tests are determined by actual exposure; thermal-transfer synthetic stock is a candidate, not a categorical rule excluding specialized outdoor direct-thermal materials.

## Pre-move test readiness and operational launch

Real operational use waits for the enclosed warehouse to be ready and existing cutover gates to pass. Private execution evidence records the expected warehouse window and pilot-order target. Preparation and physical bench tests may happen before the move; a forecast alone does not authorize live use.

The non-mutating single-file bench is retained under `scripts/fixtures/`, with a reproducible digital harness in `scripts/qualify-barcode-fixtures.mjs`. Desktop keyboard/lookup/focus checks pass, and October 19 evidence records 26 exact pixel decodes plus two blank controls across synthetic printer profiles. See [digital evidence](../research/barcode-digital-roundtrip-2026-10-19.md) and the [device procedure](../roadmap/barcode-pilot-qualification.md). These results do not exercise physical Android input, actual printing/range or a cloud command. The pinned MIT generator and isolated LGPL decoder are experiment candidates; neither is selected as an application dependency. CSS-pixel previews are uncalibrated; use measured physical dimensions rather than interpreting preview pixels as printer dots.

The pre-order software milestone belongs to Q-03: a non-mutating browser scan screen with synthetic fixtures, sample label output and operator instructions. It must visibly distinguish captured text, valid/unknown/retired fixture resolution and malformed input; preserve zeros/case; handle the documented Enter suffix and focus recovery; and demonstrate that scanning/Enter cannot submit inventory changes. Rehearse through manual/keyboard input before hardware arrives. This checks software capture/flow only; it does not prove an integrated scan engine, actual read range, printer output or cloud mutations.

After delivery, test the one pilot handheld on that screen using the manufacturer-supported wedge profile. Record exact device/OS/browser/profile and printed label dimensions, including the approximately 1–6-foot target. Q-01 final acceptance still needs actual operational identity/lineage, stock, warehouse network/locations and printer/media evidence. Q-02 cloud actions and offline replay keep their existing prerequisites. Label generation in a bench fixture does not ship Q-04 production printing.

## Acceptance and slice ownership

| Task | Owns | Complete only with |
| --- | --- | --- |
| Q-03 | Compatibility decision and reproducible non-production format/input/decoder experiment | Approved host/payload/output matrix, pinned candidate evidence, explicit camera in/out decision, measured pass/fail and unresolved items |
| Q-04 | Authorized generation and print/reprint/retire lifecycle | Role/identity/retry behavior, inspectable outputs and physical-state honesty; integration through approved printer path |
| Q-01 | Physical end-to-end label/hardware acceptance | Real scanner/host/printer/stock, measured distances/environment, reconnect and print/decode tests; no simulated physical pass |
| Q-02 / online slice | Barcode intake, authorized record resolution and confirmed cloud actions | Browser/input → resolver → existing command → second-device confirmation, including authorization and duplicate/stale cases |
| Q-02 / offline slice | Prepared offline resolution, retained confirmed work and safe replay | Actual accepted hosts, offline reload, missing assets/mapping, quota/account/revocation/conflict and duplicate-replay evidence |

Q-03 is research/decision work that can proceed with synthetic fixtures while stabilization remains open. Q-04 application implementation remains behind D-02/D-04, manual handling-unit identity and accepted Q-03 choices; non-production sample generation supports the physical gate without declaring production printing ready. Q-01 depends on the accepted Q-03 contract and P-19 identity/lineage; it may use independently generated samples and is not blocked on full Q-04 application delivery. Online Q-02 production use requires Q-01 physical acceptance and Q-04 lifecycle integration as well as its existing rollout/document/field prerequisites. Offline Q-02 follows online acceptance. These dependencies avoid making the hardware pilot wait for the feature it is meant to validate.

No company source files, cloud originals, application records, credentials, deployments or hardware settings are changed by this specification. Existing stabilization, recovery, production and source-review gates remain in force.

## Initial device acceptance scope — October 16

The user withdrew further iPhone work in favor of the primary Android barcode handheld. Physical iPhone acceptance is deferred from initial launch, not marked passed. Phones remain optional; this does not promise iOS camera or installed-app support. Qualify the named Android host/input profile and retain manual lookup. The old validation environment replay hold remains a separate legacy safety item until recovery or verified retirement/isolation is complete. Synthetic bench testing does not require the old phone export.
