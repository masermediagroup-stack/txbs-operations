# SRC-01 commercial source review checkpoint

Supporting evidence for the **TBS Operations Master Plan** and GitHub #2,
2026-10-19. This is a bounded source-content review, not import approval or complete
coverage of the 37,393-file inventory. Restricted source names, values, contact
details, payment information and screenshots remain outside the public repository.

## What changed

All 24 snapshots in the selected commercial batch now have content dispositions:
22 reviewed through worksheet cells/formulas or complete extracted PDF text, and
two image-only PDFs inspected visually across all three pages. Their original
read-only checksums all matched the preserved extraction snapshots and their
metadata remained stable during those reads. No OCR result is claimed.

The batch contains 12 workbooks and 12 PDFs. Content classified nine PDFs as
quotations/proposals, two as order confirmations and one as invoice-labelled.
Neither an invoice folder nor a quoted quantity establishes receipt or payment.
The source originals, application records and database were not changed.

A private seven-sheet workbook preserves the existing job, supplier, stock and
procurement candidate sheets, records 76 document dispositions and adds five
priority exceptions. Its cells are literal text, with no executable formulas,
external relationships or macros. Twelve previously restricted contact rows stay
omitted from ordinary contact fields; stock-verification and approval fields stay
blank/pending. Source remittance values and masked payment details are excluded
from the ordinary review export. Root/cloud candidates retain their October 13
snapshot dates. **Zero rows are approved for import.**

## Findings that affect the specification

- Preserve conflicting folder/header job assertions and hold attachment for review;
  do not automatically create an alias or rename/move a source.
- A tracker can retain an order-template heading while its subtotal range includes
  detail and aggregate rows. Review row roles, column meaning and formula
  dependencies before accepting an amount.
- Quote, order confirmation, supplier-reported shipment, receipt and payment are
  different facts. An invoice can still describe unshipped items and pending
  authorization; a carried historical quotation remains reference evidence.
- Commercial packaging, deduct, freight and installation rows need typed mapping.
  They do not automatically become product quantities or handling units.
- Useful commercial documents can include restricted personal/payment/remittance
  sections. Preserve their private provenance without copying those sections into
  ordinary previews, search, caches, exports or portfolio examples.

These rules are recorded in the [source mapping contract](../architecture/source-mapping-contract.md).
They are acceptance requirements for later import/document slices, not implemented
application filters or a bank/payment feature.

## Coverage and limits

Two additional supporting PDFs were read to investigate the job conflict. The
quote attached to the disputed PO matched the complete extracted quote text of a
separately filed supplier document. This supports a proposed canonical-job mapping;
the user confirmed that candidate mapping on October 19, while import approval
remains pending. One of the five priority exceptions now has a resolved mapping;
four remain for review. The comparison also showed
why area-priced quantities and descriptive piece counts need separate assertions.

The new ledger retains all **37,393 unique inventoried paths** and updates the
24 batch entries plus two supporting entries without dropping prior evidence. A
later same-day package pass updated the 50 template entries as described below.
It still records 37,238 general
content-review items, 50 template files with rendered-layout/import work pending, ten
representative mappings, five root inputs, and explicit unsupported/size/temporary
exceptions, plus the two supporting identity reviews. These are dispositions at
different scopes, not 37,393 accepted files. Twenty-six source snapshots were
read and checked in the initial checkpoint; the template follow-up adds 50 distinct
source snapshots for 76 checked snapshots in total.

## Template package follow-up

All 50 template workbook originals matched their saved SHA-256 values and remained
stable during the read-only inspection. Six cell-content groups correspond to
**seven byte-distinct workbook packages**. Inspecting all package members rather
than deduplicating by cell content alone preserved a variant with different
workbook, worksheet and style parts. Its rendered meaning remains unaccepted.

The ZIP/XML inspection found no comment/threaded-note parts, embedded objects,
macro parts, data connections, or hidden sheets/rows/columns in these 50 snapshots.
The seven byte-distinct representatives contain image or header-image drawings;
all three distinct image assets were visually inspected and show logos. Ten files
contain 40 email hyperlinks; none was followed. All 522 internal package
relationships resolve to an existing member. No Office application, macro, formula
or external link was executed. XML readers prohibited DTDs and external resolution.
These observations classify this batch; they are not a general workbook-security
clearance or evidence about unreviewed files.

The private ledger and seven-sheet review pack now distinguish completed package
inspection from **pending rendered layout, print and style-dependent meaning**,
including unselected template qualification alternatives. Prior review artifacts
were preserved before refreshing generated copies. All 37,393 ledger paths and
76 document dispositions remain, the previously confirmed candidate mapping is
retained, and zero rows are approved for import.

Visual tables/signatures, workbook comments/objects, canonical job/order/revision
reconciliation, source freshness, row-level approval and actual physical stock
verification remain open. The two image-only documents have reviewed visual
content but still lack machine text; their mappings require reconciliation and
approval. Later source changes invalidate approval of affected snapshots.

The private evidence includes source hashes, page/cell locators, original and
updated dispositions, immutable prior-ledger evidence, visual renders and workbook
export validation. The Master Plan remains the sole active status/priority index.
