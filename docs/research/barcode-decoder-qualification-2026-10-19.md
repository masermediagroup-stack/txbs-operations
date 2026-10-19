# Q-03 isolated Code 128 decoder qualification

Report date: 2026-10-19. Successful registry/API observations were made in the research turn begun under the 2026-10-16 client date; the environment subsequently advanced to October 19 during a network interruption. No exact observation timestamp was retained, so these are not asserted to be a fresh October 19 registry/advisory check. Scope: a proposed Node-only digital round-trip check of synthetic JsBarcode 3.11.6 labels. This is API/package research, not an executed round-trip result, application dependency selection, camera support, physical print acceptance or scanner integration.

Subsequent execution and a successful tarball-integrity check are recorded in
[the digital round-trip report](barcode-digital-roundtrip-2026-10-19.md). The
research-stage limitations below describe the earlier investigation; they do not
replace that later execution evidence or establish production acceptance.

## Exact candidate and source identity

The successful npm registry `latest` response identified **`@undecaf/zbar-wasm@0.11.0`**, declared `LGPL-2.1+`, with `gitHead` **`c04ab59682681e27a24b36b36084806437a5d224`**. The repository package metadata agrees on version and Node exports. The registry response reported 21 package files and 3,296,594 unpacked bytes. These are registry assertions rather than an independent package build verification. [npm latest metadata](https://registry.npmjs.org/@undecaf%2fzbar-wasm/latest), [repository package metadata](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/package.json)

| Registry field | Observed value |
| --- | --- |
| Tarball | `https://registry.npmjs.org/@undecaf/zbar-wasm/-/zbar-wasm-0.11.0.tgz` |
| SHA-512 SRI | `sha512-z2UZ+Uc50+qyE+HbU+Obdk/E5ecB7xYiu0i99bHQ9VlZVH0JMmE/5mJQa16Cutvwt80C9OZl8jEVayf5s5Azow==` |
| SHA-1 shasum | `dd78278388e45f13a26ce05347fcb7571a14f3e1` |

An attempted follow-up tarball download and maintenance check failed DNS/network resolution. **No independent tarball digest, signature verification, publication date, latest commit date or advisory clearance is claimed.** Before executing the proof, compare downloaded bytes with the exact registry SRI, retain that metadata, record the actual local WASM digest and runtime version, and inspect the packaged license/notices. A matching registry hash establishes consistency with that registry response; it does not establish safety, reproducible-build equivalence or authorship by itself.

The upstream build Makefile pins **ZBar 0.23.90** and Emscripten 3.1.44; the release-source enum file independently states it was copied from ZBar 0.23.90. Treat this as the declared embedded source baseline, not proof that a downloaded binary was rebuilt from exactly that source. Do not infer that the wrapper contains subsequent native ZBar fixes. [Build recipe](https://github.com/undecaf/zbar-wasm/blob/master/Makefile), [release-source enums](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/enum.ts)

## Confirmed Node API

The package exports `scanRGBABuffer(buffer, width, height, scanner?)`. It accepts an **ArrayBuffer of exactly `width * height * 4` RGBA bytes**, not encoded PNG/SVG file bytes. The helper creates the native image, scans it and destroys the image on successful completion; no result returns an empty array and a negative scan result throws. `scanImageData(image, scanner?)` simply passes `image.data.buffer`, width and height through. [Exported helper implementation](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/module.ts)

The RGBA conversion reads R/G/B and **ignores alpha** while converting to grayscale. Therefore flatten a transparent raster onto white before decoding, or require an opaque-white rasterizer output; transparent pixels with black RGB values otherwise become black. For a Node Buffer or typed-array subview, copy/slice only the intended `byteOffset .. byteOffset + byteLength` region; `.buffer` may contain unrelated pooled bytes. These conclusions follow directly from the image conversion and length check. [RGBA conversion](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/ZBarImage.ts)

The package's own Node ESM example loads a raster with `canvas`, extracts `getImageData()` and calls `scanImageData()`. It confirms Node usage, but does **not** require TBS to install canvas: any separately qualified rasterizer producing exact opaque RGBA pixels can supply the lower-level buffer API. [Official Node ESM example](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/tests/src/node-esm.ts)

Minimal adaptation for a bounded synthetic RGBA raster already supplied by the proof harness:

```js
import {
  getDefaultScanner,
  scanRGBABuffer,
  ZBarConfigType,
  ZBarSymbolType,
} from '@undecaf/zbar-wasm';

export async function decodeCode128(rgba, width, height) {
  // rgba must be a tightly bounded Uint8Array/Buffer, already flattened to white.
  if (!Number.isInteger(width) || !Number.isInteger(height)
      || width <= 0 || height <= 0
      || rgba.byteLength !== width * height * 4) {
    throw new Error('Invalid bounded RGBA fixture');
  }
  const pixels = rgba.buffer.slice(
    rgba.byteOffset, rgba.byteOffset + rgba.byteLength,
  );
  const scanner = await getDefaultScanner();
  try {
    if (scanner.setConfig(ZBarSymbolType.ZBAR_NONE,
        ZBarConfigType.ZBAR_CFG_ENABLE, 0) !== 0
        || scanner.setConfig(ZBarSymbolType.ZBAR_CODE128,
        ZBarConfigType.ZBAR_CFG_ENABLE, 1) !== 0) {
      throw new Error('Code 128 configuration rejected');
    }
    const symbols = await scanRGBABuffer(pixels, width, height, scanner);
    return symbols.map(symbol => ({
      type: symbol.type,
      text: symbol.decode(),
    }));
  } finally {
    scanner.destroy();
  }
}
```

This is a source-derived invocation, **not a claim it has been run**. The harness must additionally cap dimensions/pixel count, run with a timeout and assert exactly one result, `type === ZBarSymbolType.ZBAR_CODE128` (`128`) and exact expected text. A non-match or wrong format is a failed fixture, not a permissive fallback. The dedicated scanner disables other symbologies and enables Code 128; configuration forwards to native ZBar and its return value must be checked. [Scanner API/native forwarding](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/ZBarScanner.ts), [symbol/config enums](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/enum.ts), [native bridge](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/module.c)

`symbol.decode()` uses `TextDecoder`; `symbol.type` is numeric and `typeName` is the enum name. For the synthetic ASCII identifier profile, compare decoded text exactly, including zeroes and case. Do not use a reported quality value as physical print grading or custody evidence. [Symbol implementation](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/ZBarSymbol.ts)

## Node loading, browser workers and resource limits

Node's package export conditions select `dist/main.mjs` for import and `dist/main.cjs` for require. These execute WebAssembly under Node; this is **not a native `.node` addon or a requirement to run browser workers**. The normal package includes a separate `dist/zbar.wasm`; inlined builds are another explicitly selected condition. Use the Node entry rather than a browser bundle. [Package export map](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/package.json)

The wrapper lazily constructs and retains a WASM instance. `setModuleArgs()` can override `locateFile`, and calling it replaces the promise used by subsequent requests. Keep one controlled instance/scanner lifecycle in the proof and avoid resetting it while scanner objects are live. [Instance implementation](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/instance.ts)

Browser workers, camera permissions, HTTPS, CSP, browser bundling and offline asset preparation are a separate qualification; a successful Node decode proves none of them. For the isolated proof, use only synthetic local pixels and no camera/network input. Bound raster size and per-process time; the high-level helper destroys its image only on the successful path rather than in a `finally`, so a failed scan can leave image cleanup incomplete until process exit. A short-lived proof process contains this risk; do not extrapolate this into a long-running untrusted-image service. [Helper cleanup control flow](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/src/module.ts)

## License and maintenance disposition

Package metadata declares `LGPL-2.1+`; the project documentation describes software as LGPL 2.1 and documentation as CC-BY-SA 4.0. Retain exact package/source notices, the applicable LGPL text, version/integrity and any changes. Browser delivery of the WASM would be distribution requiring its own packaging/compliance assessment; that is outside this Node-only qualification. This research does not settle the legal obligations of a future combined distributed product. [Release package license declaration](https://github.com/undecaf/zbar-wasm/blob/c04ab59682681e27a24b36b36084806437a5d224/package.json), [project license section](https://github.com/undecaf/zbar-wasm#license), [license text](https://github.com/undecaf/zbar-wasm/blob/master/LICENSE)

The declared older native baseline and unavailable follow-up advisory/maintenance evidence limit the recommendation to a **pinned candidate for an isolated, bounded, synthetic digital check**. Do not represent the package as currently security-cleared or select it for production scanning from this report. An independent decoder round trip can validate the encoder's synthetic output; it cannot establish physical media quality, equipment compatibility, approved final token format, worker confirmation, authorization or cloud/offline acceptance.
