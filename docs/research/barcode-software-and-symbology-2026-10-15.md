# Barcode software, symbology, and browser integration research

Research date: 2026-10-15. Primary-source review supporting a proposed replacement of planned QR labels with linear barcode labels. Recommendations below are design proposals, not implemented capability or hardware acceptance. No company source records were used or changed.

## Findings that determine the architecture

ZBar reads images and video and returns decoded barcode values. It is not a label generator, inventory database, scanner networking service, or cloud synchronization system. Its maintained upstream is `mchehab/zbar`; that repository explicitly warns that the original SourceForge documentation is stale. It supports Code 128 and several other formats. Do not select an abandoned binary or assume that a JavaScript package named after ZBar contains current upstream fixes. [Maintained ZBar project](https://github.com/mchehab/zbar)

A hardware scanner configured as a USB HID keyboard already decodes the physical bars. The host receives keyboard input. Zebra documents both HID setup and per-model keyboard settings. Consequently, a keyboard-wedge path needs an application input/resolution workflow, not ZBar. This does not establish compatibility with every device: exact model, host, interface mode, keyboard country, prefix/suffix, cable/adapter and reconnect behavior need verification. [Zebra HID connection instructions](https://docs.zebra.com/us/en/tablets/et5-series/et51-56-prg/c-et51-56-data-capture/t-usb-connecting-a-usb-scanner-using-hid.html), [USB defaults and configuration](https://docs.zebra.com/us/en/scanners/general/sm72-ig/usb-interface/usb-parameter-defaults.html)

Recommended baseline: generate a compact internal Code 128 token on a handling-unit label; accept it through a focused scan screen; resolve it through the authenticated application; show the handling unit and permitted actions; require the user to confirm a business command. A successful decode identifies a record and does not prove receipt, arrival, quantity, identity or authorization. This is an architectural recommendation preserving the existing scan safety contract in [the expansion specification](../architecture/expanded-operations-specification.md).

## Symbology and identifier choice

| Choice | Evidence and fit | Proposed disposition |
| --- | --- | --- |
| Ordinary Code 128 | BWIPP identifies warehouse/bin/inventory labels as non-GS1 uses; full ASCII support, automatic required symbol checksum, and numeric/alphanumeric encoding make it a useful internal carrier. | Preferred candidate for TBS handling-unit labels; choose the actual token length only after width and distance trials. |
| Code 39 | BWIPP documents its restricted basic alphabet and optional check digit; extended mode changes how characters are represented. | Retain only if chosen legacy hardware/workflow requires it. Prefer Code 128 rather than imposing Code 39 alphabet/length constraints. |
| GS1-128 | A Code 128 subset with FNC1 following the start character and structured GS1 Application Identifiers. | Separate interoperability option, required only if agreed trading-partner workflows need GS1 identifiers. Do not label arbitrary internal strings as GS1-128. |
| QR | A two-dimensional barcode, supported by image-decoding tools as a separate format. | Remove as the proposed TBS label output if the user's linear-barcode direction is adopted; hardware capable of reading 2D codes remains compatible with linear labels. |

Sources: [BWIPP Code 128](https://github.com/bwipp/postscriptbarcode/wiki/Code-128), [BWIPP Code 39](https://github.com/bwipp/postscriptbarcode/wiki/Code-39), [GS1-128 format](https://support.gs1.org/support/solutions/articles/43000734455-what-is-the-format-of-gs1-128-), [ZBar formats](https://github.com/mchehab/zbar).

Code 128 does not impose the GS1-128 rule limiting symbols to 48 data characters. Its usable length is constrained by print width, module size and scanner configuration; avoid confusing the GS1 application limit with the underlying symbology. The encoder must calculate the symbol checksum; it does not substitute for a database uniqueness constraint, authenticated access or an optional human transcription check. [BWIPP Code 128](https://github.com/bwipp/postscriptbarcode/wiki/Code-128), [GS1-128 format limit](https://support.gs1.org/support/solutions/articles/43000734455-what-is-the-format-of-gs1-128-)

GS1's SSCC identifies an individual logistic unit, potentially containing mixed trade items; a GTIN identifies a trade item. SSCC is therefore closer to the handling-unit identity than a product UPC. SSCC creation uses a GS1 Company Prefix; a single licensed GTIN is insufficient. An internal ordinary Code 128 identifier is a separate namespace and must not be presented as a globally allocated SSCC. Consider GS1 only after an external interoperability need is established. [GS1 SSCC](https://www.gs1.org/standards/id-keys/sscc), [GS1 US available barcode/SSCC guidance](https://www.help.gs1us.org/barcodes-available-in-gs1-us-data-hub), [GS1 US prefix guidance](https://www.gs1us.org/small-business/the-power-of-the-prefix)

Proposed identifier design: an immutable, opaque, random token with an entity namespace and format version, allocated with a database uniqueness constraint and collision retry. Keep token length, alphabet and any application check character as explicit pilot decisions. Do not encode project names, vendor names, quantities, destinations, prices, personal information, credentials, access grants or the changing contents of a mixed-product unit. Keep the internal database UUID separate if a shorter print token is needed. Print a legible human identifier for manual lookup. Store manufacturer GTINs, supplier references and tracking barcodes as typed external references; none automatically becomes a TBS unit identifier. These are proposed TBS requirements, not properties supplied by ZBar.

## Generation and print fidelity

`bwip-js` is a JavaScript port of BWIPP and supports Node/browser execution, PNG/canvas and SVG output. It can generate Code 128 without transmitting private identifiers to a third-party online generator. Its platform-specific packages permit a server or browser renderer; deployment and package selection remain implementation decisions. Modules must be sized consistently: its documentation explains why arbitrary pixel resizing can break barcode dimensions. [bwip-js documentation](https://github.com/metafloor/bwip-js)

`JsBarcode` also generates Code 128, supports automatic code-set switching, and can render SVG/canvas/image output. It is a narrower candidate when the label requirement stays with common linear codes. It is a generator rather than an image decoder or scanner bridge. Select one generator after a print/decode test rather than adopting both by default. [JsBarcode documentation](https://github.com/lindell/JsBarcode)

Use high contrast, preserve a clear quiet zone, and avoid scaling a final bitmap to fit an arbitrary box. TEC-IT's barcode reference specifies quiet-zone guidance for Code 128; use the applicable symbology/printing profile and actual printer dots, not CSS pixel assumptions. Zebra exposes a reduced-quiet-zone decode setting, which is a reader tolerance option rather than permission to design cropped labels. Test the production label material, print darkness/speed, DPI, label width, wrapping, abrasion and intended scan distance. [TEC-IT barcode reference](https://www.tec-it.com/Download/PDF/Barcode_Reference_EN.pdf), [Zebra reduced quiet-zone setting](https://docs.zebra.com/us/en/scanners/general/sm72-ig/symbologies/code-128/code-128-reduced-quiet-zone.html)

Proposed acceptance: generated tokens decode to exactly the original string; leading zeros and case survive; both independently generated and physically printed samples work; short/long tokens fit; low-contrast, damaged and wrong-namespace input fails safely; a reprint keeps identity; retiring or splitting a unit preserves historical resolution without making retired contents actionable. Label layout, printer connection and material selection remain unaccepted until the hardware pilot.

## Camera scanning is a separate input path

Native `BarcodeDetector` is experimental/limited and cannot be assumed across browsers. The current MDN compatibility data lists Android Chrome support, desktop platform restrictions, no Firefox implementation, and Safari/iOS support behind a preference. Feature-detect the API, call `getSupportedFormats()`, and validate `code_128` on the actual device; do not ask field users to enable experimental browser flags as a product prerequisite. [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API), [maintained compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/BarcodeDetector.json), [API specification](https://wicg.github.io/shape-detection-api/#barcode-detection-api)

For iPhone/browser camera coverage, evaluate a pinned image-decoder fallback. `@undecaf/zbar-wasm` wraps ZBar in WebAssembly and supports Code 128, `ImageData`/buffers, browser execution and workers. Its source Makefile currently pins ZBar `0.23.90`; that is not evidence it tracks every newer upstream fix. Review the exact package's embedded native version and security history before adoption. Its performance claims are maintainer claims, not TBS device benchmarks. [zbar-wasm](https://github.com/undecaf/zbar-wasm), [build version pin](https://github.com/undecaf/zbar-wasm/blob/master/Makefile)

Camera access requires a secure context and permission. `localhost` is an exception on the same device; opening a laptop's plain `http://192.168...:3000` address from an iPhone does not inherit that exception. Use a trusted HTTPS preview or another approved HTTPS test origin for physical camera testing. Handle permission denial, camera-in-use, rear camera selection, autofocus and stopping tracks when leaving the screen. [getUserMedia security requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

Proposed camera architecture: local camera frames → bounded sampling/crop → native decoder or worker fallback → strict text validation → the same resolver used by HID/manual entry. Self-host pinned JS/WASM assets under the application's content-security policy; preload them only when needed. Camera frames need not be uploaded to decode. If camera support is out of the initial pilot, defer its library and license work rather than make it a dependency of HID scanning. This is an architecture proposal requiring physical iPhone/Android measurements.

## Licensing and maintenance checks

| Component | Primary license evidence | Adoption consequence |
| --- | --- | --- |
| ZBar | LGPL 2.1 text in upstream. | Record native version, notices and any modifications; review the actual packaging/linking/distribution route. |
| undecaf/zbar-wasm | Software LGPL 2.1; documentation CC-BY-SA 4.0. | Browser-delivered WASM needs an explicit compliance review. Preserve license/notices and corresponding source/build materials as applicable; review replacement/relink requirements for the exact bundle. Do not assume browser delivery is server-only use. |
| bwip-js | MIT. | Preserve copyright/permission notice. Inspect packaged BWIPP and font/dependency notices too. |
| BWIPP | MIT. | Preserve its distinct notice where included. |
| JsBarcode | MIT. | Preserve its notice; inspect any server-rendering dependencies separately. |

Sources: [ZBar license](https://github.com/mchehab/zbar/blob/master/LICENSE.md), [zbar-wasm license and documentation terms](https://github.com/undecaf/zbar-wasm#license), [LGPL 2.1 license text](https://raw.githubusercontent.com/undecaf/zbar-wasm/master/LICENSE), [bwip-js license](https://github.com/metafloor/bwip-js/blob/master/LICENSE), [BWIPP license](https://github.com/bwipp/postscriptbarcode/blob/master/LICENSE), [JsBarcode license](https://github.com/lindell/JsBarcode/blob/master/MIT-LICENSE.txt).

This table is an engineering compliance checklist, not a legal opinion about a future combined work. Review the selected release and distribution artifacts before shipping. No library is selected or installed by this research.

## Cloud commands and offline boundaries

These proposals preserve the existing specification's authorization, command, revision and replay requirements; none is provided by a barcode decoder. [Existing expansion specification](../architecture/expanded-operations-specification.md)

1. Validate bounded input and namespace before lookup; preserve the exact token. Strip only documented transport framing, such as a configured suffix, rather than arbitrary control characters. Scan input must never execute a URL, script, keyboard shortcut, SQL fragment or raw printer command.
2. Resolve through current role/account/assignment checks. Unknown, unauthorized and retired identifiers must have safe outcomes without leaking company records. A random identifier is not an access token. HID input is indistinguishable from ordinary typing for this purpose, so scanner possession does not establish the actor.
3. Require an explicit intended workflow and confirmation. A bulk scan may collect candidates into a visible review list, but it cannot silently receive or move an entire unit. Preserve product quantity/UOM versus package count and the mixed-product single-job unit model.
4. Send confirmed operations through the existing authenticated cloud command boundary with actor, action, quantities, destination where required, original revision and idempotency key. Debounce repeated camera frames for interface convenience; server-side idempotency and revision conflicts provide mutation safety.
5. For offline use, prepare only permitted unit mappings/records for the current account and environment; mark queued commands pending. Persist user-confirmed commands and evidence, then replay exactly once under a valid session and current authorization. A scanner's buffered list of codes has no reliable business actor, quantity or event-time semantics by itself.
6. Keep manual lookup and entry usable. Verify online confirmation on another authorized device. Retain the existing replay hold, recovery, session-isolation and physical-device gates rather than declaring them passed because a scan decoded successfully.

The strongest first experiment is a disposable synthetic handling unit, a printed Code 128 label, one explicitly configured HID scanner and a non-mutating browser intake. Expand to confirmed commands only after identity/input/print compatibility succeeds. This is proposed pilot scope; it does not authorize a production stock change.

## Questions that materially change scope

- Which station is first: fixed receiving desk, mobile warehouse worker, jobsite crew, or all three?
- Does each scan need a screen immediately, or is a later batch upload acceptable?
- Is the objective to identify a physical unit, a product SKU, a warehouse location, or several separately typed entities?
- What device must host the app: Windows PC, iPhone, Android phone, or an industrial Android handheld?
- What are actual scan distance, gloves, dust/water/impact exposure, throughput and connectivity gaps?
- Must any outside customer/supplier consume the label as a GS1 logistic label?
- Is phone-camera scanning required in the first barcode release, or can it follow the HID pilot?

These decisions should determine hardware and tickets. They do not block updating the planning terminology from QR to barcode or preserving manual-first behavior.
