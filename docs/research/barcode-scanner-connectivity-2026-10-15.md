# Barcode scanner connectivity and label hardware research

Research date: 2026-10-15. Scope: primary manufacturer documentation for connecting scanners and printers to a cloud-hosted web application. This is supporting research, not an additional development plan. Hardware examples are evaluation candidates; none has been purchased, physically tested, or approved. No current price quotes were collected. All identifiers below are synthetic.

## Findings that determine the design

The practical integration has two separate links: **scanner to application device**, then **application device to the cloud application**. A Bluetooth scanner paired to a phone does not need its own Wi-Fi connection. A USB scanner plugged into a PC does not communicate directly with the cloud. In keyboard-emulation mode the host receives decoded characters, which the application can then validate and submit. Zebra documents Bluetooth HID as keystroke delivery; Socket documents the same mode working with Safari and ordinary web text fields. [Zebra HID host parameters](https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/radio-communications/hid-host-parameters.html), [Socket setup and application compatibility](https://www.socketmobile.com/support/faq/all-faqs)

**Wireless does not mean Wi-Fi.** NETUM's official 2.4 GHz instructions pair a scanner to its USB dongle. Datalogic lists QM2500 proprietary STAR radios at 433.92 or 910 MHz, and QBT2500 Bluetooth at 2.4 GHz. These are distinct communication options. The inference for procurement is to require an explicit interface specification, rather than treating “wireless” or “2.4G” in a product title as evidence of router connectivity. [NETUM dongle pairing](https://support.netum.net/hc/en-us/articles/44018685692827-Wireless-Barcode-Scanner-Connects-Via-2-4-GHz-Dongle), [Datalogic QuickScan 2500 datasheet](https://cdn.datalogic.com/Download?iddwnfile=40613)

A genuine Wi-Fi terminal can run the application itself. Zebra lists TC22 as WLAN/WPAN and TC27 as WWAN/WLAN/WPAN, with integrated scanning and a touchscreen. DataWedge can deliver scans into foreground applications as keystrokes, or provide Android intents for an application that implements a receiver. The proposed browser-first approach is therefore feasible without a custom native scanner driver, subject to a physical browser/device pilot. [TC22/TC27 specifications](https://www.zebra.com/gb/en/products/spec-sheets/mobile-computers/handheld/tc22-tc27.html), [DataWedge getting started](https://techdocs.zebra.com/datawedge/latest/guide/gettingstarted/)

The application must distinguish a successful barcode decode from a confirmed business transaction. In Zebra batch mode a good-decode beep and green LED can mean that the barcode was stored in scanner memory. Transmission can happen later after reconnection or cradle insertion. A scan beep alone cannot establish that an authenticated cloud request passed permission, quantity, allocation, and concurrency checks. [Zebra batch-mode behavior](https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/radio-communications/general-radio-parameters/batch-mode.html)

## Connectivity choices

| Device class | First connection | Where the web application runs | Proposed fit | Main qualification |
| --- | --- | --- | --- | --- |
| Corded USB HID scanner | Cable to PC; keyboard-emulation interface | PC browser | Receiving/packing desk | Exact cable/interface, host keyboard layout, scan focus, configured terminator |
| Cordless scanner with USB base or dongle | Bluetooth or proprietary radio to a base, then USB to PC | PC browser | Moving a short distance around a station | Base pairing, actual range, return-to-range behavior, operator attribution |
| Bluetooth HID scanner | Paired directly to supported phone/tablet/PC | Paired device browser | Reuse existing phones/tablets | Supported HID mode on the exact model, keyboard visibility, reconnection, battery |
| Android handheld with integrated scanner | Internal scan engine; handheld connects by Wi-Fi or cellular | Handheld browser | Warehouse walking and job-site actions | Scan-output profile, device management, screen/glove ergonomics, network coverage |
| Specialized Wi-Fi wearable/scanner | Vendor-specific Wi-Fi and SDK/protocol | Device-specific workflow or connected service | Later high-volume hands-free work | Explicit integration protocol and application effort; no assumption that it is a browser |

Evidence for the first four rows comes from the manufacturer interfaces and mode descriptions cited above and below. The fit and qualification columns are proposed TBS design judgments, not manufacturer guarantees.

### USB and base-connected stations

Zebra's DS2200 family includes the corded DS2208 and cordless DS2278, both 1D/2D imagers. Honeywell's Voyager XP 1472g datasheet lists Bluetooth and host USB, keyboard-wedge, and RS-232 interfaces. Those lists demonstrate why the purchase must identify the complete kit: scanner body, compatible cable or base, power/charging accessories, and intended host interface. They do not prove that every accessory bundle includes all of them. [Zebra DS2200 specifications](https://www.zebra.com/us/en/products/spec-sheets/scanners/general-purpose-scanners/handheld/ds2200-series.html), [Honeywell 1472g datasheet](https://prod-edam.honeywell.com/content/dam/honeywell-edam/sps/ppr/en-gb/public/products/barcode-scanners/general-purpose-handheld/1472g/documents/sps-ppr-voyager-xp-1472g-general-duty-scanner-data-sheet-en.pdf?download=false)

Keyboard output is configurable. Zebra provides country-keyboard settings, and its DS2208 guide includes an “Add Enter Key” configuration barcode. A scanner/host language mismatch can change punctuation, so a successful test of digits alone is insufficient. [Zebra keyboard country configuration](https://docs.zebra.com/us/en/scanners/general/ds4-series/ds4678-prg/country-codes/usb-and-keyboard-wedge-country-keyboard-types-%28country-codes%29.html), [DS2208 quick start, useful barcodes](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/ds2208-qsg-en.pdf), [Zebra special-character troubleshooting](https://support.zebra.com/article/000019412)

Proposed station contract:

1. Configure the scanner as USB HID keyboard; choose the host's keyboard country and a documented Enter suffix.
2. Open the authenticated application and enter an explicit scan session with its operation and location visible.
3. Focus the scan input and read a synthetic label such as `TBS-HU-000001`. Preserve the entire value as text.
4. Resolve the label to a record, show its job/content/location and allowed actions, and collect the required quantity or recipient details.
5. Submit through the application's authenticated API and display the returned transaction result. The app supplies the operational success indication.
6. Keep manual ID entry available for a damaged label or unavailable scanner.

This is a proposed application contract. Keyboard timing must not be treated as authentication or a reliable device identity. A scan can arrive at the wrong focused field, and multiple scanners paired to one dongle do not automatically identify different workers. For example, NETUM explicitly supports one dongle paired with multiple scanners. [NETUM one-to-many pairing](https://support.netum.net/hc/en-us/articles/44018685692827-Wireless-Barcode-Scanner-Connects-Via-2-4-GHz-Dongle)

### Bluetooth with iPhone, iPad, Android, or Windows

Socket's basic HID mode pairs through the host's Bluetooth settings and delivers to the active text field. Its guide notes that an inactive field can result in a decoded scan with no delivered application data. The proposed software must make the scan field and readiness obvious, recover focus after dialogs, and show an error when a scan does not resolve. [Socket HID setup and focus behavior](https://www.socketmobile.com/support/faq/all-faqs)

iOS requires special attention: an attached HID scanner can hide the onscreen keyboard. Socket documents a double press of the power button to toggle it. Zebra's CS6080 documents an Apple virtual-keyboard toggle that must be enabled, with trigger/program-button behavior depending on configuration. These controls are model-specific; do not promise one universal gesture for every scanner. [Socket iOS keyboard guidance](https://www.socketmobile.com/support/faq/all-faqs), [CS6080 reference guide, Apple iOS Virtual Keyboard Toggle](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/cs6080-prg-en.pdf)

Basic HID is different from a vendor's application mode. Socket application mode requires an application integrated with CaptureSDK and an appropriate Bluetooth profile; Zebra also has an iOS scanner SDK for supported BLE or MFi scanners. An SDK's existence does not make an ordinary Safari page a native SDK application. The proposed first pilot should use explicitly supported HID before considering a native wrapper or SDK integration. [Socket application-mode configuration](https://docs.socketmobile.dev/capture/ios/en/latest/ConfigureInAppMode.html), [Zebra iOS scanner SDK](https://www.zebra.com/us/en/support-downloads/software/scanner-software/scanner-sdk-for-iOS.html)

Pilot the actual phone OS, browser, scanner SKU, and firmware together. Test quantity entry with the onscreen keyboard, switching between scan and text fields, sleep/wake, a dead scanner battery, walking out of range, reconnecting after leaving another paired device nearby, and more than one operator sharing a phone. These are proposed acceptance cases, not claims that every device fails them.

### Wi-Fi Android handheld

DataWedge keystroke output is suitable for an ordinary focused browser input. Its documentation distinguishes character strings and key events, includes Enter/Tab behavior, and offers delays when an app cannot accept data at its default delivery speed. Therefore test the page's actual input/composition and submit handling; do not rely exclusively on individual desktop-style `keydown` events or a typing-speed heuristic. [DataWedge keystroke output](https://techdocs.zebra.com/datawedge/latest/guide/output/keystroke/)

For richer integration, DataWedge intent output provides scan data, label type, and other metadata to an Android application receiver. Zebra Enterprise Browser adds an intent bridge that exposes received data to page JavaScript. The proposed escalation is a native wrapper or the vendor's supported enterprise browser only if the HID pilot proves insufficient; it creates deployment, maintenance, and potentially licensing work that must be evaluated separately. [DataWedge intent output](https://techdocs.zebra.com/datawedge/15-0/guide/output/intent/), [Enterprise Browser DataWedge intent guide](https://techdocs.zebra.com/enterprise-browser/3-3/guide/dwintents/)

TC22/TC27 specifications list enterprise Wi-Fi features and fast-roaming mechanisms. The same sheet distinguishes Wi-Fi-only TC22 from cellular TC27 and places qualifications on some options, including the license requirement for Wi-Fi 6E. Those capabilities are not proof of coverage or uninterrupted cloud service at a particular warehouse. Proposed qualification should include a walk test between access points and outside loading doors, then a separate WAN-disconnection test. [TC22/TC27 WLAN, WWAN, fast-roam, and footnotes](https://www.zebra.com/gb/en/products/spec-sheets/mobile-computers/handheld/tc22-tc27.html)

### Specialized Wi-Fi scanner without a separate phone

True standalone devices exist. Honeywell distinguishes the 8680i Standard Bluetooth model from an Advanced model with Wi-Fi, customizable display, buttons, and an SDK for directed workflows. Zebra's WS50 is an Android wearable with Wi-Fi and a touchscreen, with scan-engine availability dependent on configuration. These are different purchases from a Bluetooth ring scanner that still requires a host. [Honeywell 8680i model distinctions](https://automation.honeywell.com/us/en/products/productivity-solutions/barcode-scanners/wearable/8680i-wearable-mini-mobile-computer), [Zebra WS50 specifications](https://www.zebra.com/us/en/products/spec-sheets/mobile-computers/wearable/ws50.html)

The Honeywell Wi-Fi SDK download was access-restricted during this research. Its exact transport, authentication, and cloud compatibility were not verified. Do not promise direct TBS API integration from the product description alone. A screenless Wi-Fi device also needs some defined place to hold operation context and return validation feedback; that is an application architecture decision, not a benefit conferred by the presence of a Wi-Fi radio.

### IP output is a separate gateway architecture

DataWedge IP output sends TCP/UDP to an IP address and port. Zebra recommends Windows IPWedge, which inserts received data as keystrokes or clipboard text. Zebra permits configuring another receiving application but explicitly marks that custom receiving scenario unsupported. It is not documented here as an authenticated HTTPS business API client. [DataWedge IP output, including custom receiver warning](https://techdocs.zebra.com/datawedge/latest/guide/output/ip/)

Proposed decision: prefer a logged-in browser on the handheld or host. Do not add an always-on LAN receiver, public inbound scanner port, or raw TCP cloud gateway merely to deliver an identifier. If a future use case requires a gateway, specify supported transport, identity, permissions, replay protection, operation context, monitoring, and business-result acknowledgments as a separate integration.

“Wi-Fi Friendly Mode” on a Bluetooth scanner is not Wi-Fi client support. Zebra describes channel avoidance by the scanner and cradle after their connection is established. [CS6080 reference guide, Wi-Fi Friendly Mode](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/cs6080-prg-en.pdf)

## Offline and batch behavior

Hardware buffering and offline application transactions are separate features. Zebra documents multiple batch modes, finite memory, transmission on reconnection or cradle contact, and interrupted transfers. Those capabilities preserve decoded strings; they do not themselves preserve all required job, product line, quantity, UOM, user, recipient, approval, and concurrent inventory context. The application must supply and validate that context. [DS2278 reference guide, Batch Mode](https://www.zebra.com/content/dam/support-dam/en/documentation/unrestricted/guide/product/ds2278-prg-en.pdf)

Proposed initial pilot: turn off unexpected out-of-range replay for operational scan sessions, or explicitly detect and handle the documented batch flow. A burst of old IDs must not land in a newly focused quantity field or a different job session. Add application-level offline capture only behind a separate ticket that preserves operation context, durable client action IDs, pending/conflict/confirmed states, permission revalidation, and retry safety. Never report “stock moved” while an action exists only locally.

Use separate test failures for Bluetooth/base-radio loss, host Wi-Fi loss, WAN loss, session expiry, and a server rejecting the operation. A device can be connected to an access point while unable to reach the cloud. This distinction follows from the proposed two-link architecture; actual network behavior must be tested in the deployment environment.

## Barcode engines and ruggedness

Selecting linear Code 128 labels does not require buying a 1D-only laser scanner. Zebra's DS2200 and Honeywell's Voyager 1472g are examples of 1D/2D imagers. A 2D-capable imager can preserve compatibility with printed linear labels and common supplier codes without requiring QR on TBS labels. The symbologies and minimum element sizes supported by the exact scan engine still need checking. [Zebra DS2200 specifications](https://www.zebra.com/us/en/products/spec-sheets/scanners/general-purpose-scanners/handheld/ds2200-series.html), [Honeywell 1472g product specifications](https://automation.honeywell.com/us/en/products/productivity-solutions/barcode-scanners/general-purpose-handheld/voyager-xp-1472g-general-duty-scanner)

Retail, mobile, and industrial devices have different environmental specifications. Socket's D760 lists IP54 and Bluetooth. Zebra's DS3600-DPA lists IP65/IP68 sealing, drop specifications, temperature limits, and Bluetooth HID/SPP. These examples demonstrate which specifications to compare; they do not establish that TBS needs direct-part-mark capability or an ultra-rugged SKU. Require evidence for actual dust, drops, moisture, gloves, sunlight, distance, and label density before selecting a device. [Socket D760](https://www.socketmobile.com/products/d760), [Zebra DS3600-DPA specifications](https://www.zebra.com/us/en/products/spec-sheets/scanners/ultra-rugged-scanners/ds36x8-dpa.html)

No purchase price or cost savings claim is validated here. For budgeting, compare complete scenario quotes: (a) USB scanner plus existing station, (b) Bluetooth scanner plus existing phone/tablet, (c) rugged Android handheld, and (d) specialized wearable. Include bases, cables, battery spares, chargers, cases, support, optional software/management licenses, and replacement stock. This is a proposed total-cost comparison, not a guaranteed ranking of market prices.

## Printers, durable labels, and cloud printing

Direct thermal uses heat-sensitive media without a ribbon. Thermal transfer uses a ribbon and matched media; ordinary direct-thermal labels are vulnerable to prolonged heat, sunlight, or abrasion. For outdoor or repeatedly handled stock, evaluate thermal-transfer synthetic labels and a compatible resin or wax/resin ribbon against actual exposure. [Zebra printing-method comparison](https://prod-www.zebra.com/us/en/resource-library/faq/difference-between-direct-thermal-and-thermal-transfer-printing.html), [Zebra ribbon formulations](https://www.zebra.com/content/dam/zebra_dam/en/brochure/portfolio/supplies-brochure-thermal-transfer-ribbons-en-us.pdf)

Do not make an absolute claim that all direct-thermal labels are unsuitable outdoors: Zebra's current catalog includes a specialized Enduraguard 4000D direct-thermal synthetic outdoor material. A specific tested material, adhesive, ribbon where applicable, and exposure rating matter more than a technology name alone. [Zebra label/tag catalog](https://www.zebra.com/us/en/products/supplies/labels-tags.html)

Proposed pilot samples should cover cardboard, shrink wrap, plastic, painted metal, dusty surfaces, and removable/tie-on tags as applicable. Validate adhesion, wet handling, abrasion, sunlight, print darkness, barcode readability, human-readable ID, and replacement-label procedure. Those are proposed tests; no sample has been exposed or verified yet.

A network printer and a scanner require separate integrations. Zebra Browser Print supports browser applications through an installed local client; its support page lists Windows/macOS network and USB, and Android network/Bluetooth. The current demo lists Windows 11/macOS and supported browsers. iOS is not listed on that support page, so ordinary Safari-to-raw-ZPL printing must not be assumed. [Browser Print support and platform list](https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html), [Current Browser Print demo prerequisites](https://techdocs.zebra.com/link-os/latest/demos/browser-print/)

Proposed first printing path: generate a correctly sized label document for a configured station printer and require a physical calibration/readability test. Later direct printing can use an explicitly supported local client or managed print service, with print request tracking, printer errors, audited reprints, and no inbound public printer port. Scanner compatibility does not prove printer compatibility.

## Proposed pilot and ticket acceptance evidence

These are inputs for the Master Plan/ticket owner; this research does not publish or reprioritize tickets.

1. **Device and operating model selection:** choose whether operators carry a screen. Collect exact scanner/terminal/printer SKUs, host OS/browser, firmware, accessories, and network requirements. Obtain quotes only after the workflow decision.
2. **Scanner input and lookup:** demonstrate one USB HID station and one intended mobile mode; preserve zeros, handle Enter/suffix/locale, maintain visible scan readiness, reject unknown/retired/wrong-entity IDs, recover from sleep/reconnect, and retain manual entry.
3. **Transaction feedback:** show decoded, lookup result, pending, rejected, and server-confirmed states separately. Demonstrate duplicate submissions and concurrent updates without double-counting.
4. **Label generation and print route:** print synthetic labels at final physical dimensions on the actual printer/media combination, verify supported Code 128 decoding, human-readable fallback, quiet zones, and audited reprints. Test the selected host-to-printer path separately from scanner input.
5. **Connectivity and offline qualification:** walk receiving, storage, and loading areas; test AP roaming, radio loss, WAN outage, batch replay, session expiry, and recovery. Keep offline operational submission blocked until conflict and retry evidence passes.
6. **Environmental acceptance:** record scans of clean, wet, dirty, rubbed, curved, and partially damaged test labels at required distances; use repeatable targets and a chosen failure threshold rather than manufacturer marketing alone.

Questions with the greatest architectural impact: Must staff work without a phone/tablet screen? Must actions complete outside Wi-Fi/cellular coverage? Are labels indoors for weeks or outdoors for months? How far away are labels scanned? How many workers scan simultaneously? Which existing host devices and printers should be reused? These determine the appropriate pilot; a random scanner purchase cannot answer them.
