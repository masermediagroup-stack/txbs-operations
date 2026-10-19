# Q-03 digital barcode round-trip evidence

Observed 2026-10-19 on Windows x64 with Node.js 24.22.0. This supports Q-03 in
the **TBS Operations Master Plan**; Q-03 and physical Q-01 acceptance remain open.
The user confirmed on October 19 that the first pilot uses internal handling-unit
identifiers. Supplier/customer GS1 and SSCC requirements are separate. This does
not approve the final internal token shape.

## Result

**26 generated Code 128 images decoded to their exact expected strings. Two blank
controls returned no symbols.** No network request or business mutation occurred
inside the proof worker. This establishes a synthetic encoder/rasterizer/decoder
round trip, not Android input, camera support, physical print quality, reading
distance, cloud integration or a production library selection.

| Evidence | Observation |
| --- | --- |
| Existing bench labels | Active and retired symbols, each 440 × 132 intrinsic pixels, decoded exactly |
| Printer-profile experiments | Four strings × three integer module widths × two nominal DPIs = 24 images |
| Leading zeros | Preserved for active, retired and all-zero unknown fixtures |
| Case control | `TESTHU-00a17b29` decoded with lowercase intact, then the bench correctly rejected it |
| Resolver behavior | Active/retired/unknown/invalid outcomes retained; Enter remains lookup only |
| Blank controls | Two opaque-white 600 × 160 rasters returned zero symbols |
| Physical evidence | Not run; no scanner or printer result inferred |

The fourth string is an intentional format control, not a valid TBS unit. A
readable Code 128 symbol is not automatically an accepted business identifier.
Decoded unknown text never creates a record; a retired identity does not select a
successor or perform a stock action. The fixture has no account, API or database
connection. Two product content lines remain independent of package counts and
their quantities/UOM remain explicitly unknown.

## Exact components and method

The committed [standalone bench](../../scripts/fixtures/barcode-scanner-bench.html)
embeds the MIT Code 128 build of **JsBarcode 3.11.6**, including its license notice.
Generator SHA-256:
`fce0a5e6129fde04b2e5f8a503b32a3d6d4b0116263c5369336ecccad57bf334`.
Bench SHA-256:
`d6379f0f669862fc058af0a3a4e365a7d84b96afa4b33cd7eef3df34b06d6227`.
This is synthetic qualification tooling; no application route imports it.
[Pinned generator distribution](https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/barcodes/JsBarcode.code128.min.js)

The [harness](../../scripts/qualify-barcode-fixtures.mjs) executes the actual
embedded generator and SVG renderer under jsdom 30.0.1, using
`@napi-rs/canvas` 1.0.11 for real text measurement and SVG rasterization. It does
not stub JsBarcode. Rasters are composited onto opaque white, bounded to two
million pixels, and passed as exact RGBA buffers to the independent decoder.
Only Code 128 is enabled. Each positive case must return exactly one symbol of
the correct type and exact text. The parent process enforces a 45-second worker
timeout, including synchronous WASM execution. Scanner resources are destroyed
when the worker finishes. See the [decoder API investigation](barcode-decoder-qualification-2026-10-19.md).

**`@undecaf/zbar-wasm` 0.11.0** was installed with scripts disabled in an isolated
workspace outside the application. No application dependency or lockfile changed.
The package declares LGPL-2.1+ and a ZBar 0.23.90 build baseline. The downloaded
1,907,536-byte tarball matched the earlier registry SHA-512 integrity value:

```text
sha512-z2UZ+Uc50+qyE+HbU+Obdk/E5ecB7xYiu0i99bHQ9VlZVH0JMmE/5mJQa16Cutvwt80C9OZl8jEVayf5s5Azow==
```

The executed WASM SHA-256 is
`438f95e4b5d122c4c2a8da2b72ad19faa4ba4e541f473dcae0371e4cfc8159ee`.
Its package license text is retained locally. This subsequent download/integrity
check succeeded after the research agent's network failure; the earlier report's
limitation describes that earlier attempt. Matching the registry hash is not a
current advisory clearance, signed provenance or reproducible-build proof. The
older embedded native baseline is not accepted for production camera delivery.
[Exact package tarball](https://registry.npmjs.org/@undecaf/zbar-wasm/-/zbar-wasm-0.11.0.tgz)

## Measured size tradeoff

For the active 14-character bench token, the renderer produced **200 bar-pattern
modules** and **10 modules of white space on each side**, or 220 modules across
the full symbol. These are measurements of these fixtures, not the approved final
identity format or a general maximum. Other token content/length can change
Code 128's encoded width; rerun the worst case of the approved profile before
selecting stock or accepting range.

| Nominal printer DPI | Dots per module | Module width, mm | Symbol width including white space, mm |
| --- | --- | --- | --- |
| 203 | 1 | 0.125 | 27.53 |
| 203 | 2 | 0.250 | 55.05 |
| 203 | 3 | 0.375 | 82.58 |
| 300 | 1 | 0.085 | 18.63 |
| 300 | 2 | 0.169 | 37.25 |
| 300 | 3 | 0.254 | 55.88 |

The one-dot cases are digital stress cases, not recommended stock or distance
profiles. Bars are half an inch high before text and margins in the printer-profile
experiments. A smaller successful raster does not mean a handheld can read a
small physical label. A larger footprint also does not establish six-foot range.

The bench's original CSS-pixel labels are **uncalibrated**. Printing them at 100%
does not convert screen pixels into 203- or 300-DPI printer dots. The separate
pilot calibration sheet expresses its SVG dimensions in millimeters and includes
a 25.4 mm ruler mark. Actual print scaling, driver rasterization, stock/printer
resolution, bars and white space must still be measured. A nominal-dot profile
printed on different equipment is not a verified printer profile.

## Reproduce

Use the repository's supported Node runtime and existing locked dependencies.
Create a decoder workspace **outside the repository**; install only the exact
candidate with lifecycle scripts disabled. The following placeholders are paths
chosen by the operator, not literal folder names. Use a new or empty evidence
directory for each run; the harness refuses to overwrite prior results:

```powershell
npm ci --ignore-scripts
npm install --prefix "<decoder-workspace>" --ignore-scripts --save-exact --no-audit --no-fund "@undecaf/zbar-wasm@0.11.0"
node scripts/qualify-barcode-fixtures.mjs "<decoder-workspace>" "<evidence-output>"
```

Keep that isolated lockfile and compare its exact resolved URL/integrity with the
value above before execution. The harness checks the bench/generator identities,
qualified DOM/rasterizer versions, decoder version and executed WASM identity. Preserve the resulting
`results.json`, SVGs, PNGs, runtime and package/license evidence. No decoder is
downloaded or installed by the harness itself. Do not use this bounded fixture
worker as an untrusted-image service.

The [device qualification procedure](../roadmap/barcode-pilot-qualification.md)
owns the next physical observations. It does not replace the Master Plan or turn
these digital results into a pass for Q-01, Q-02 or Q-04.
