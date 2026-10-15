# Expanded operations specification

Draft supporting `WF-03`, dated 2026-10-12; barcode direction updated 2026-10-15. Accepted business requirements are captured here for review; source mapping and some implementation choices remain open. This document does not replace the master `TODO.md`, close `SRC-01`/`WF-02`/`WF-03`, authorize release past their gates, or claim any new production capability is implemented. Read the [architecture assessment](expanded-workflow-assessment-2026-10-12.md) for current-code evidence.

## Problem and intended behavior

TBS needs a job-centered operational system linking approved submittals, purchasing, product quantities and packaging, receiving, physical custody, installation, invoice reconciliation, and supporting documents. Office and field users need to see the same authorized cloud facts and record their part of the process inside the app. The source server remains a read-only reference archive; app-owned records and copied/generated document versions become the working system.

The first expansion begins after submittal preparation, with an explicit early-PO exception for suppliers requiring a PO to produce submittals. Manual workflows must work before barcode hardware is chosen. Existing Inventory, Receiving, Movement, Outbound, My Work, Issues, and offline command behavior are reused and extended.

## User stories

1. As an Operator, I can locate one canonical job by its complete string job number or reviewed alias so that short legacy references do not create duplicates.
2. As an Operator, I can create and edit job destinations, contacts, status, and assignments without changing the job's inventory identity.
3. As an Operator, I can inspect a source-file import preview and reject bad rows before creating business records.
4. As an Operator, I can retain source provenance and a private copy while leaving the original server/cloud file unchanged.
5. As an Operator, I can build and edit operational drafts and generate documents inside the app.
6. As an Operator, I can view document versions and link the exact version used for an approval or issued PO.
7. As an Operator, I can maintain suppliers while preserving TBS material wording separately from supplier wording/references.
8. As an Operator, I can request products using product quantity/UOM independently of box/pallet/bundle counts.
9. As an Operator, I can approve my own request/PO with separate creation and approval events.
10. As an Operator, I can create a supplier PO that allocates line quantities and costs to multiple jobs with reconciled totals.
11. As an Operator, I can issue an early PO to obtain submittals while material release remains held.
12. As an Operator, I can record GC/designer approval evidence, approver identity, date, and document revision.
13. As an Operator, I can explicitly release eligible lines/packages without treating the whole job or PO as released.
14. As an Operator, I can see when changed/superseded evidence invalidates a release or requires a correction.
15. As an Operator, I can generate an immutable issued PO revision with a unique sequential company number.
16. As an Operator, I can export its PDF for Outlook and record the actual sent revision, sender, time, acknowledgment, and expected dates.
17. As an Operator, I can receive part of a PO and see ordered, received, and remaining product quantities.
18. As an Operator, I can preserve wrong/short/over/damaged receipt facts and linked evidence/Issues without hiding discrepancies.
19. As an Operator, I can retain unresolved identity/unknown quantity and later correct it without inventing a zero or rewriting history.
20. As an Operator, I can receive general/shared stock and explicitly allocate or split it for jobs before outbound.
21. As an Operator, I can identify a handling unit, its contents, physical Site/location, and lineage through splits/repacking.
22. As an Operator, I can route a delivery to a warehouse or directly to the job while preserving real custody facts.
23. As an Operator, I can prepare/authorize an outbound manifest from the material's physical Site independently of the job identity.
24. As a permitted field user, I can record who actually takes material and its destination, separately from the recording actor.
25. As an assigned Tech, I can acknowledge actual arrival/recipient quantities separately from departure and PO receiving reconciliation.
26. As an Operator, I can see partial handoffs and remaining quantities, including direct deliveries without a fabricated warehouse departure.
27. As an assigned Tech, I can record installation against eligible arrived quantities with the actual TBS crew lead/members, time, recorder, notes, and permitted evidence.
28. As an assigned Tech, I can report blocked/damaged/missing/incorrect material with linked Issues and required damage evidence.
29. As a Tech, I can see only the context needed for assigned work while supplier/cost/invoice/approval information remains inaccessible.
30. As an Operator, I can match invoice lines to PO revisions/allocations and receipts, review discrepancies, approve corrections, and export accounting data.
31. As an Operator, I can track reminders for held releases, missing acknowledgments, late deliveries, and pending handoffs with failure visibility.
32. As an authorized user, I can see confirmed cloud changes from another device, with actor and audit history.
33. As a field user, I can complete supported manual tasks without a printer or dedicated scanner.
34. As an authorized field user, I can later scan a handling-unit barcode through an accepted scanner/host input path, open the permitted record and confirm an eligible action.
35. As an offline field user, I can use prepared permitted records, retain pending work/photos, and see exactly-once cloud acceptance after reconnect.
36. As an Operator, I can reconcile duplicate imports, retries, stale commands, reversals, and document revisions without silently losing or replacing evidence.

## Interface and migration decisions

- Preserve the single-package modular monolith and existing feature ownership. Commercial commands/documents need their own role boundaries; current broad active-Site Inventory read access is not an acceptable commercial-document policy.
- Reuse the existing Inventory service/command and PostgreSQL command boundaries for atomic physical changes. Reuse field-work commands for assignments and installation. Evolve contracts with explicit version compatibility for retained offline queues and snapshots.
- Reuse project UUIDs and preserve the full job number as text. Review alias mapping and collision resolution before import; do not invent suffixes or infer uniqueness from current nonunique indexes.
- Expand additively before migrating callers. Existing lot/receipt/outbound quantities count packages; retain that meaning for historical and queued records. Never silently convert package counts into product quantities. A handling unit can contain several different product lines for one job, as confirmed on 2026-10-13; every line retains independent product identity, quantity/UOM and lineage. See ADR 0010. Product/UOM precision and conversion rules remain explicit decisions.
- General/shared stock needs an explicit allocation model because current Material Lots require a project. Never represent unallocated stock as an invented customer job. Outbound handling units belong to one job.
- Supplier POs may span jobs. Reconcile quantity/cost allocations to each issued line/revision. Start new numbers in the `TBS-PO-000001` namespace at the first unused number; allocate atomically and keep the base across revisions. Preserve legacy PO labels and supplier references separately.
- Separate request/PO approval, PO issuance, submittal evidence, and material release. One authorized Operator can self-approve with distinct events. Held early POs do not authorize material release. Release uses exact approval revision and line/package scope with online validation.
- Treat checkout/departure, arrival/recipient, and installation as separate quantity/person/time facts. Installation eligibility comes from acknowledged arrival; direct deliveries retain receipt/arrival lineage without invented warehouse events. Recording actor and actual crew/participants are separate identities.
- Extend private storage through a dedicated document contract; the current image-only evidence contract remains intact. Link immutable document versions to business records, source provenance, approvals, issued outputs, and invoices. Preview/download support is explicit per format; full Word/Excel editing remains undecided.
- Cloud ingestion begins with controlled copies selected by an Operator. The hosted app cannot directly open the laptop's mapped drive. No source writeback or bidirectional synchronization is part of this workflow.
- Cloud reminders use durable leases/retries/idempotency and current record revisions. They do not approve/release POs, change stock, execute payments, or edit source files. Accounting export preserves accounting-system payment/ledger ownership.
- Barcode labeling replaces the earlier QR-first output direction per the October 15 user request. A compact opaque handling-unit token resolves inside the authenticated app; Code 128 is the proposed pilot symbology, not an accepted format yet. The primary screen-equipped handheld should run the authenticated app itself, with Android preferred and phones optional; its vendor-supported integrated scanner input feeds the shared resolver. USB/Bluetooth HID remains another decoded-text input path. ZBar is an optional image-decoding candidate rather than the hardware/cloud connector or label generator. A scan opens context and an explicit worker-confirmed permitted command changes state; a scanner Enter suffix performs lookup only. Manual entry uses the same resolver/actions. Offline operation requires prepared account/environment-scoped mappings and permitted records, not unrestricted cached authenticated pages or automatic scanner-memory replay. See [the barcode labeling contract](barcode-labeling-contract.md) for connectivity, printing, identity, physical acceptance and unresolved operating choices.

## Behavioral test interfaces

Test at the highest existing command/service interface that exposes the behavior. Keep database security/atomicity and real hosted object/device acceptance as separate evidence.

| Interface | Required behavior |
| --- | --- |
| Local source-audit interface | Year/root scope, read-only sources, local non-repository output, explicit format exceptions, resumable checkpoints, preserved string/formula evidence, source-change detection. |
| Inventory service and database commands | Two physical Sites for one job, atomic receipt/lineage, unknown product quantity, package/product separation, split/repack/allocation conservation, partial custody, direct delivery, stale/duplicate commands and reversals. |
| Commercial commands and database authorization | Concurrent PO numbering, immutable revisions, separate self-approval events, held early POs, invalid approval revisions, exact shared-job allocations, partial receiving, invoice discrepancies, and Operator/assigned-Tech/unrelated-Tech/inactive/anonymous boundaries. |
| Field-work commands | Arrival limits installation, actual crew distinct from recorder, assigned-only access, partial/blocked/damaged outcomes, exactly-once offline replay, wrong-account/expired-session denial. |
| Private document upload/download | Type/size/content verification, stable upload identity, lost-response retry, immutable versions, short-lived authorized access, assignment/cost isolation, metadata plus byte restoration. |
| Durable worker | Duplicate/stale/cancelled reminder work, restart and expired lease, retry/backoff, failed-job visibility and authorized redrive, no duplicate delivery or business approval. |
| Browser and physical iPhone journeys | One demonstrable journey per slice; keyboard/mobile/error states; manual paths before barcode hardware; scan → authorized action → API/database confirmation → second-device visibility; offline pending/confirmed state. |

## Open design choices

These choices do not reopen accepted business decisions: product UOM precision/conversion; handling-unit repack/return conservation; allocation corrections; crew/recipient authority; direct-delivery custody details; document format/size/preview/editor choices; company retention/restore targets; offline scan resolver and conflict presentation. Multi-product handling-unit content cardinality was settled on 2026-10-13. The October 15 handling-unit barcode/worker-confirmation direction is accepted; a screen-equipped integrated handheld is the primary device and Android is preferred, with phones optional. One pilot handheld and an approximately 1–6-foot scan target are confirmed; the hardware budget including charging equipment is recorded privately. These requirements do not establish physical read-range acceptance. The primary scanner environment is the enclosed warehouse; outdoor yard-scanner acceptance is not required for the first pilot. Exact handheld/OS/browser/input profile, payload/label density, printing workflow and optional phone-camera compatibility remain Q-03 decisions. Post-dispatch label exposure is separately determined if labels must support later jobsite scanning. Resolve affected choices before implementing their slice, with an ADR only where a consequential tradeoff warrants one.

## Boundaries and rollout

The existing A-08R replay hold/recovery and physical acceptance remain open; A-10 controls the next application wave. Later expansion remains behind D-02/D-04 and its source/specification prerequisites. Real company uploads, live reminders, and cutover retain PROD-01 through PROD-05. Manual handling-unit workflows precede production barcode use. Q-03 research/synthetic compatibility work can proceed now; Q-04 owns application label generation/lifecycle behind implementation gates. Q-01 independently qualifies physical hardware/media using synthetic samples; online Q-02 requires Q-01 and Q-04, and offline Q-02 follows its online slice.

### Warehouse launch and pre-move scanner qualification

The user confirmed that real operational use starts only after the enclosed warehouse is ready. The expected warehouse window and pilot-order target are private forecasts, not fixed launch commitments. No countdown or calendar date overrides readiness, source/import review, authorization, recovery, field or production acceptance. Keep existing Site records and history; confirm the actual warehouse Site/locations at onboarding rather than inventing or deleting locations now. Reverify actual opening stock at cutover instead of treating earlier source counts as warehouse stock.

Q-03 preparation can proceed before the move: build a minimal non-mutating browser scan test screen with synthetic unit IDs, sample label outputs, exact input/suffix/focus feedback and repeatable instructions. A manual/keyboard rehearsal must demonstrate capture, validation, lookup/error feedback and that Enter cannot mutate stock. This is ready-to-order software evidence, not physical scanner, range or cloud-command acceptance. Order timing remains a user purchasing decision. Test the delivered device with its manufacturer-supported output profile before the move; finish real warehouse Wi-Fi coverage, physical placement, printer/media, user workflow and operational acceptance after access is available. Q-01/Q-02 and PROD-05 retain final acceptance ownership; the bench test does not require every expanded operations ticket to be implemented.

Out of scope for this release: source-folder edits, automatic payment/ledger execution, automatic supplier email integration, a full replacement for estimating/submittal preparation, unauthenticated barcode contents, invented historical stock movements, and implicit conversion of old quantities. Generic Office document editing is a design decision rather than a promised capability. Public GitHub tickets use technical requirements and synthetic examples; restricted company evidence stays outside the repository/tracker.

## Published Master Plan behavior slices

Published on 2026-10-12 under the user's instruction to execute the updated plan and create tickets. This table is a specification-to-ticket reference, not a second priority/status plan. Root `TODO.md`, titled **TBS Operations Master Plan**, remains authoritative. Every issue includes roles, public interfaces, acceptance, blockers, unresolved decisions, validation and rollout/rollback. Final source/design reconciliation remains WF-03 work; publication does not imply a feature is implemented.

| Master Plan ID | Behavior slice | GitHub ticket |
| --- | --- | --- |
| D-02 | Record stabilization acceptance before expanded operations | [#6](https://github.com/masermediagroup-stack/txbs-operations/issues/6) |
| D-03 | Reconcile commercial and physical command contracts | [#7](https://github.com/masermediagroup-stack/txbs-operations/issues/7) |
| D-04 | Define capability-specific rollout and rollback evidence | [#8](https://github.com/masermediagroup-stack/txbs-operations/issues/8) |
| P-15 | Resolve canonical job numbers and reviewed aliases | [#9](https://github.com/masermediagroup-stack/txbs-operations/issues/9) |
| P-15 | Edit job context and assigned work in the Project Hub | [#10](https://github.com/masermediagroup-stack/txbs-operations/issues/10) |
| P-19 | Track product quantities inside manually identified handling units | [#11](https://github.com/masermediagroup-stack/txbs-operations/issues/11) |
| P-19 | Split, repack and allocate shared stock without losing lineage | [#12](https://github.com/masermediagroup-stack/txbs-operations/issues/12) |
| CLOUD-01 | Upload, preview and revise private system-owned job documents | [#13](https://github.com/masermediagroup-stack/txbs-operations/issues/13) |
| CLOUD-01 | Restore document metadata and bytes together | [#14](https://github.com/masermediagroup-stack/txbs-operations/issues/14) |
| P-11 | Edit suppliers and submit product purchase requests | [#15](https://github.com/masermediagroup-stack/txbs-operations/issues/15) |
| P-11 | Preview and validate supplier and request spreadsheet imports | [#16](https://github.com/masermediagroup-stack/txbs-operations/issues/16) |
| P-18 | Record submittal approval and explicitly release eligible material | [#17](https://github.com/masermediagroup-stack/txbs-operations/issues/17) |
| P-12 | Issue numbered supplier POs with reconciled job allocations | [#18](https://github.com/masermediagroup-stack/txbs-operations/issues/18) |
| P-12 | Record sent PO revisions and supplier acknowledgment | [#19](https://github.com/masermediagroup-stack/txbs-operations/issues/19) |
| P-13 | Receive partial PO quantities into traced warehouse material | [#20](https://github.com/masermediagroup-stack/txbs-operations/issues/20) |
| P-13 | Reconcile direct-to-jobsite receipts without warehouse events | [#21](https://github.com/masermediagroup-stack/txbs-operations/issues/21) |
| P-16 | Authorize pickups and record actual checkout custody | [#22](https://github.com/masermediagroup-stack/txbs-operations/issues/22) |
| P-16 | Acknowledge recipient arrival and partial handoff | [#23](https://github.com/masermediagroup-stack/txbs-operations/issues/23) |
| P-17 | Confirm crew installation against arrived quantities | [#24](https://github.com/masermediagroup-stack/txbs-operations/issues/24) |
| P-20 | Match invoices, approve discrepancies and export to accounting | [#25](https://github.com/masermediagroup-stack/txbs-operations/issues/25) |
| CLOUD-02 | Deliver durable reminders with recoverable failures | [#26](https://github.com/masermediagroup-stack/txbs-operations/issues/26) |
| Q-01 | Accept physical barcode labels, scanner connections and print quality | [#27](https://github.com/masermediagroup-stack/txbs-operations/issues/27) |
| Q-02 | Resolve barcode scans and confirm authorized cloud actions | [#28](https://github.com/masermediagroup-stack/txbs-operations/issues/28) |
| Q-02 | Resolve prepared offline barcodes and replay confirmed work once | [#29](https://github.com/masermediagroup-stack/txbs-operations/issues/29) |
| Q-03 | Prove barcode format and device compatibility | [#32](https://github.com/masermediagroup-stack/txbs-operations/issues/32) |
| Q-04 | Generate barcodes with an auditable print lifecycle | [#33](https://github.com/masermediagroup-stack/txbs-operations/issues/33) |
| P-14 | Preview and reconcile reviewed opening-data imports | [#30](https://github.com/masermediagroup-stack/txbs-operations/issues/30) |
| P-14 | Report and pilot the complete request-to-installation workflow | [#31](https://github.com/masermediagroup-stack/txbs-operations/issues/31) |
