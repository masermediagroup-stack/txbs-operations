# Read-only company source audit

Implementation support for `SRC-01`. This tool prepares local evidence; it does not import business records, authorize production use, or establish human document review. The master `TODO.md` controls priority and acceptance.

## Run a bounded scan

Requires Node.js 22.13+ or 24+ and installed development dependencies. PDF text extraction uses the pinned `pdfjs-dist` package. Office extraction uses Windows PowerShell and the built-in .NET ZIP/XML readers, without a laptop execution-policy change.

```powershell
npm run audit:sources -- --source 'F:\TBS' --output "$env:LOCALAPPDATA\TBS\source-audit-2026" --max-directories 100 --extract-root
npm run audit:sources -- --source 'F:\TBS' --output "$env:LOCALAPPDATA\TBS\source-audit-2026" --resume --max-directories 100
npm run audit:sources -- --source 'F:\TBS' --output "$env:LOCALAPPDATA\TBS\source-audit-2026" --resume --max-directories 100 --extract-limit 20
```

Use the available Node runtime directly when npm is unavailable. `--since` defaults to 2026. The scope includes year folders from that year onward beneath `1. Estimating` and `2. Projects`, plus root XLSX workbooks and XLSX cloud-link shortcuts. Older year folders, resource/archive roots, and root Office lock files are excluded. Nested temporary Office files are inventoried but not read. A quote dated earlier inside a scoped job remains reference evidence; filenames do not establish a transaction date.

Output must be on the local system drive, separate from the source tree, and outside Git repositories. This prevents accidental source writeback or publication of company contents. Restrict access to the chosen local folder under company policy; it may contain commercial information. The tool does not upload anything. Source paths are opened read-only. Cloud shortcut targets are recorded as inert text, not visited or downloaded.

## Manifest and extraction coverage

`manifest.json` records relative source paths, size, modification time, scope, excluded roots, enumeration errors, remaining directories, extraction state, and human-review state. Checkpoints resume a bounded scan without dropping directories or duplicating files. Ctrl+C requests a stop after the current directory and writes the checkpoint. An existing audit requires `--resume`; choose a new private output folder for a fresh scan. Enumeration failures are retained as exceptions and require review or a new scan; resume does not silently declare failed paths readable.

`--extract-root` reads the eligible root files; `--extract-limit` bounds supported files attempted per invocation. Extracted JSON goes under `extracted/`, with SHA-256 provenance in the manifest. A before/after content and metadata check flags files changed during reading. A source scan is not a point-in-time server snapshot: coordinate a reviewed import snapshot before cutover.

Extraction writes a local staged artifact, verifies the source again, then atomically publishes the artifact before checkpointing provenance. If an interruption leaves an artifact before its checkpoint, resume re-extracts and verifies the current source rather than trusting or failing on that orphan. Previously checkpointed `EEXIST` extraction failures are retried; completed records remain untouched. Run only one scan/extraction process against a given audit directory at a time.

| Format | Current reader behavior |
| --- | --- |
| XLSX/XLSM | All worksheet cells, hidden sheet state, string identity, raw values, style indexes, formulas, and cached values. No formula or macro execution. Date serials/number formats are not rendered. Images, charts, and embedded objects need visual review. |
| DOCX | Text parts including body, headers/footers, notes, and comments when present. Layout and embedded content need visual review. |
| PPTX | Slide text parts. Slide order/layout, speaker notes, and embedded content need separate review. |
| PDF | Page text with page numbers, a 300-page/two-million-character limit, explicit truncation, and empty-text page flags for visual/OCR review. Drawing meaning, table structure, images, and reading order need review; no OCR is performed. Embedded scripts are not executed. |
| TXT/CSV/TSV/MD/JSON/XML/URL | Inert source text; UTF-8 and BOM-marked UTF-16LE. Other encodings require a separate reader. |
| Scanned images, legacy XLS/DOC/PPT, mail files, other binary formats | `unsupported-format`; no claim that contents were read. Plan a reviewed OCR/legacy/mail reader or manual inspection. |

The file limit is 40 MiB. Reader child processes have a two-minute runtime and 32 MiB output bound. Office extraction additionally bounds XML parts and total XML bytes and prohibits DTD/external XML resolution. Oversized, unreadable, malformed, encrypted, unavailable-reader, temporary, partial, or unsupported files remain explicit states. Reading formulas, links, or instructions in a document does not execute or follow them. Resuming with the new PDF reader reclassifies previously unsupported PDFs for a bounded attempt.

## Review before import

Use the complete inventory to account for every in-scope file. Review extracted content alongside its original visual context where needed; record unreadable/unsupported exceptions. Reconcile job aliases, quantities/UOM, supplier references, and shared-order allocations without inferring missing facts. Credential-bearing notes require restricted handling and are not ordinary import fields. Physical stock requires physical verification. Source files remain unchanged; approved application imports use system-owned copies and retain immutable provenance.

Technical regression coverage uses synthetic fixtures for year scope, root cloud links, output boundaries, checkpoint/resume, inert text/hash provenance, unsupported/oversized files, actual PDF text/empty-page flags, and Windows Office extraction preserving string IDs/formulas/source bytes. This is preparation tooling, not the future in-app document editor. PDF integration follows [Mozilla's Node example](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs).
