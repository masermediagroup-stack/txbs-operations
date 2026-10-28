# Source mapping contract

Supporting SRC-01/WF-02/WF-03 in the **TBS Operations Master Plan**. This describes source-grounded technical import behavior; private mappings retain original filenames, row/cell/page locators, values and checksums outside Git. It does not approve an import or complete the entire source audit.

## Preserve before interpreting

An import candidate retains source identity/checksum, original value/type/style/formula where applicable, sheet/row or page locator, extraction/review method, proposed business mapping and unresolved exceptions. Originals are read-only. A source change invalidates prior approval of the affected candidate; confirmation applies to an identified system-owned snapshot, never an unversioned live link.

Each field has a disposition: confirmed mapping, proposed mapping awaiting review, historical/reference only, restricted evidence, unsupported/unreadable/visual exception, or excluded scope. Missing, unknown, ambiguous and conflicting are distinct from zero or false. Extracted text alone does not establish table rows, drawing approval or physical custody. Imports preview errors before any business mutation.

## Job identity and scheduling

Keep complete canonical job numbers as text and reuse reviewed project IDs. Retain short/numeric/raw references as candidates until corroborated by independent identity evidence. Do not append a suffix, remove trailing zeros, merge repeated names, or interpret repeated procurement rows as separate jobs. Rows that combine several jobs require explicit resolution.

When a folder, filename, document header or priced quote names different jobs or
revisions, preserve each assertion and hold the proposed attachment for identity
review. A convenient folder location or a copied header is not sufficient to
create a canonical alias, move the original or choose the winning identity.

Scope eligibility is reviewed per record. A current root sheet can contain historical rows; a document carried in an in-scope job folder can predate the folder year. Contract, bid, scheduling and badging fields remain distinct from stock state and actual installation events. Crew initials, contact prose and project-manager names do not create authenticated accounts.

## Suppliers and commercial orders

Model supplier, manufacturer, category, contact and portal references separately. Repeated contact rows do not necessarily represent duplicate suppliers. Header layouts are resolved per sheet, including shifted columns; do not apply one positional map to every tab. Notes containing credentials belong to restricted evidence and are excluded from business imports, previews, generated documents, search and field caches.

Apply restricted handling to payment-card details, personal billing fields and
bank/remittance instructions embedded in otherwise useful commercial documents.
Review at page/section level before an ordinary preview, index, cache or export;
do not copy the entire document text into operational fields. Preserve the private
original and provenance. Source payment instructions never authorize payment or
changes to supplier banking; payment execution remains outside this application.

Template defaults, blank material rows, cached zeros, suggested destinations and unselected qualification alternatives are not order, release, participant or custody facts. Review exact extracted-content clusters while retaining each file's provenance and separate visual/comment/embedded-object exceptions. Preserve quote-level legacy orders when product lines or quantity/UOM are absent. Do not invent detailed SKU lines from totals or template content. Historical PO labels, quote references, confirmations and future sequential PO numbers are separate identifiers. An apparent revision pair requires identity/revision reconciliation; changed totals do not establish approval or sent history.

## Approval and custody facts

Folder names, status prose and supplier request-method fields do not establish an approval or material release. Explicit evidence must identify approval revision, approver, date and eligible scope; recorded release remains a separate event. A supplier report of shipment or an intended destination cannot establish actual receipt, recipient acceptance or installation.

Documents described as receipts may be purchase/sample-order confirmations. Classify from readable content and visual evidence as needed. Receiving records known actual facts or explicit unknown quantity/UOM without discarding unresolved or non-PO receipts; preserve receipt/material lineage, actor and existing required material/damage evidence. PO matching, handling-unit allocation and outbound eligibility apply their own confirmed-quantity rules. The invoice's ordered, shipped and backordered quantities remain distinct assertions until reconciled with actual receipt records.

## Quantities, money and stock

Product quantity/UOM and physical package counts are separate. Preserve compound quantity/unit strings (synthetic example: `2LS`) as raw evidence until the commercial unit is reviewed; do not convert a lump-sum quote into a product or package count. The same column may contain unit price in one legacy layout and UOM in another; resolve headers per document. Multiple product lines can share one job's handling unit; conserve each known product quantity/UOM through allocation, split and repack. Preserve missing UOM; do not default it to a unit or infer contents from weight/tracking references. Commercial freight/charges are not stock product rows and must not be counted twice when shown in both lines and totals.

A supplier line may price an area quantity while its description lists pieces and
dimensions. Preserve the commercial UOM and the separate piece-count assertion;
require reviewed conversion rules before allocation. Do not create two stock
quantities from those representations or interpret an unspecified weight as units.

Keep source monetary strings and formulas as private evidence until currency, decimal interpretation and total reconciliation are approved. Cached totals, formula errors and blank summaries do not establish correct derived amounts. Validate spreadsheet epoch and displayed number/date formats; date-only scheduling values are not invented UTC activity timestamps, and prose dates without a year remain unresolved.

A reused order template can become a tracker whose formula range includes both
detail rows and billed/sent/remaining summaries. Identify row roles and formula
dependencies before treating a subtotal as a commercial amount. Preserve long
floating-point source strings and the intended display format without silently
rounding, recalculating or substituting an approved financial value. Quoted pallet,
packaging, discount, freight and installation-service rows require explicit line
classification; they do not automatically create stock or handling-unit records.

Overstock lists create unverified stock candidates. Opening stock requires current physical verification, unit interpretation, actual Site/location, handling-unit identity, condition, allocation and required evidence. Neither file metadata nor a spreadsheet count establishes presence. Preserve historic reference notes without creating historical receipt/movement/handoff/install events.

## Source review evidence and remaining work

The October 13 pass covers field mappings from all five current root inputs (including fresh read-only snapshots of the two cloud workbooks) and ten representative Projects documents. A changed local root workbook was re-extracted and reviewed while retaining the prior snapshot as stale evidence. One selected drawing, one sample-order document and both sampled invoices received private visual checks. Invoice product/quantity/charge alignment and duplicate freight presentation were reconciled; absent units and an unlabeled date remain unresolved. Remaining workbook-formatting and whole-inventory content exceptions stay open. A private per-file ledger accounts for every inventoried file with honest pending/review/exception status. No import rows are approved by this pass.

An October 13 execution pass produced a private six-sheet review workbook and 74 additional files across two extraction batches. Fifty template workbooks were reviewed through six exact cell-content clusters; three further commercial documents received text mapping review. Two commercial-batch PDFs require visual/OCR review, and the remaining batch documents retain pending content/mapping status. Template cell review does not certify comments, visuals or embedded content. All review-pack rows remain unapproved.

On October 19, the 24-file commercial batch reached content dispositions for all
its files: 22 text mappings and two image-only quotations inspected visually over
three pages. Machine text remains unavailable for those two PDFs; no OCR pass is
claimed. All 24 source checksums matched their preserved snapshots during fresh
read-only checks. Nine PDFs were quotations/proposals, two were order confirmations
and one was invoice-labelled; folder names did not establish document type or
custody. A private seven-sheet review pack adds five priority exceptions while
preserving the earlier candidate sheets and pending approvals. Wider visual,
embedded-content, identity/revision and import review remains open. Root/cloud
candidate snapshots in that pack remain dated October 13. Two additional supporting
PDFs corroborated the proposed job mapping through an exact attached-quote text
comparison; the user confirmed that candidate mapping on October 19. Import
approval remains separate. The pack now holds 76 document
dispositions, including those two supporting files. See the
[public-safe checkpoint](../research/source-review-checkpoint-2026-10-19.md).

A later October 19 package pass revalidated all 50 template source hashes and
inspected their seven byte-distinct packages, rather than assuming the six equal
cell-content groups also shared layout and styles. No comment, embedded-object,
macro, connection or hidden sheet/row/column content was found in that batch.
Its three distinct image assets are reviewed logos; email hyperlinks remain inert
and were not followed. Those package exceptions are narrowed to rendered layout,
print/style-dependent meaning and final disposition/import review. This does not
close visual or embedded-content exceptions for other documents or approve any
template as an operational record.

Final full-file review, mappings, physical stock verification, UOM/money/return/correction/participant/editor/recovery/offline decisions, and the existing stabilization/rollout gates remain in the Master Plan. This contract supports ticket acceptance; it does not make blocked features ready.
