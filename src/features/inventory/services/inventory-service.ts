import { inventorySnapshotSchema, migrateInventorySnapshot, unknownPosition, type AccessibilityState, type ConditionState, type InventorySnapshot, type IssuePriority, type IssueStatus, type IssueType, type MaterialLot, type PackageType, type PhotoRecord, type PhotoType, type PositionPrecision, type ProjectStatus, type ProtectionState, type StoragePosition } from "@/features/inventory/domain/inventory"
import { activeOutboundLines, isIssueActive, lotVerificationState } from "@/features/inventory/domain/selectors"
import type { InventoryPersistence, PhotoBlob } from "@/features/inventory/repositories/inventory-persistence"

type LocationInput = { locationId: string | null; precision: PositionPrecision; row?: StoragePosition["row"]; column?: StoragePosition["column"]; positionNote?: string }
type EvidenceInput = { file?: File | null; photoType?: PhotoType; caption?: string }
type MultipleEvidenceInput = Omit<EvidenceInput, "file"> & { file?: File | null; files?: File[] }
type OperatorInput = { operatorName: string }

export type AddMaterialInput = OperatorInput & LocationInput & EvidenceInput & {
  projectId: string; materialName: string; description: string; packageType: PackageType; quantity: number | null
  condition: ConditionState; protection: ProtectionState; accessibility: AccessibilityState; handlingRequirements: string[]
}
export type UpdateProjectStatusInput = OperatorInput & { projectId: string; status: ProjectStatus; expectedVersion: number; clientMutationId: string; note: string }
export type VerifyLotInput = OperatorInput & LocationInput & EvidenceInput & { lotId: string; note: string }
type IssueLinksInput = { projectId: string | null; lotId: string | null; receiptId: string | null; locationId: string | null; movementId: string | null; outboundBatchId: string | null }
export type RecordIssueInput = OperatorInput & EvidenceInput & IssueLinksInput & { siteId: string; type: IssueType; priority: IssuePriority; title: string; description: string; blocking: boolean; clientMutationId: string }
export type AssignIssueInput = OperatorInput & { issueId: string; assigneeName: string }
export type AddIssueCommentInput = OperatorInput & EvidenceInput & { issueId: string; body: string }
export type TransitionIssueInput = OperatorInput & { issueId: string; toStatus: IssueStatus; note: string; resolvedProjectId?: string | null }
export type ReceiptLineInput = MultipleEvidenceInput & { id?: string; materialName: string; description: string; packageType: PackageType; quantity: number | null; condition: ConditionState; protection: ProtectionState; accessibility: AccessibilityState; handlingRequirements: string[]; targetLocationId: string | null }
export type SaveReceiptDraftInput = OperatorInput & { receiptId?: string; siteId: string; receiptNumber: string; projectId: string | null; inspectionState: "Pending" | "Passed" | "Exception"; handwrittenProjectText: string; physicalLabelApplied: boolean; stagingLocationId: string | null; notes: string; documentFile?: File | null; documentFiles?: File[]; labelFile?: File | null; lines: ReceiptLineInput[] }
export type MoveMaterialInput = OperatorInput & MultipleEvidenceInput & LocationInput & { locationId: string; reason: string; note: string; clientMutationId: string; lines: Array<{ lotId: string; quantity: number | null; expectedVersion: number }> }
export type ReverseMovementInput = OperatorInput & { movementId: string; note: string; clientMutationId: string }
export type CreateOutboundBatchInput = OperatorInput & { projectId: string; clientMutationId: string; lines: Array<{ lotId: string; quantity: number | null; expectedVersion: number }> }
export type MarkOutboundReadyInput = OperatorInput & { batchId: string; clientMutationId: string }
export type DepartOutboundBatchInput = OperatorInput & EvidenceInput & { batchId: string; clientMutationId: string; carrierReference: string; driverReference: string; note: string }
export type CancelOutboundBatchInput = OperatorInput & { batchId: string; clientMutationId: string; note: string }
export type ReverseOutboundBatchInput = OperatorInput & { batchId: string; clientMutationId: string; note: string }

type BackupArchive = {
  format: "tbs-operations-inventory-backup"
  formatVersion: 1
  exportedAt: string
  snapshot: InventorySnapshot
  photos: Array<{ key: string; contentType: string; base64: string; checksum: string }>
}

function requiredName(name: string) {
  const value = name.trim()
  if (!value) throw new Error("Operator name is required.")
  return value
}

function position(input: LocationInput): StoragePosition {
  if (input.precision === "Unknown") return unknownPosition()
  if (input.precision === "Exact" && (!input.row || !input.column)) throw new Error("Exact positions require both a row and a column.")
  return { precision: input.precision, row: input.precision === "Exact" ? input.row ?? null : null, column: input.precision === "Exact" ? input.column ?? null : null, note: input.positionNote?.trim() ?? "" }
}

function samePosition(left: StoragePosition, right: StoragePosition) {
  return left.precision === right.precision && left.row === right.row && left.column === right.column && left.note === right.note
}

function evidenceFiles(input: MultipleEvidenceInput) {
  const files = [...(input.files ?? []), ...(input.file ? [input.file] : [])].filter((file, index, all) => file.size > 0 && all.indexOf(file) === index)
  if (files.length > 3) throw new Error("Select no more than 3 photos.")
  return files
}

async function sha256(blob: Blob) {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBlob(base64: string, contentType: string) {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new Blob([bytes], { type: contentType })
}

export function createInventoryService(persistence: InventoryPersistence, seed: InventorySnapshot) {
  async function transact(change: (snapshot: InventorySnapshot, now: string) => { snapshot: InventorySnapshot; blobs?: PhotoBlob[] }) {
    const current = migrateInventorySnapshot(await persistence.load(seed))
    const now = new Date().toISOString()
    const result = change(structuredClone(current), now)
    result.snapshot.revision = current.revision + 1
    inventorySnapshotSchema.parse(result.snapshot)
    await persistence.commit(current.revision, result.snapshot, result.blobs)
    return result.snapshot
  }

  function addEvidence(snapshot: InventorySnapshot, now: string, operatorName: string, evidence: EvidenceInput, links: { siteId: string; projectId: string | null; lotId: string | null; receiptId: string | null; movementId: string | null; outboundBatchId: string | null; issueId: string | null; locationId: string | null }) {
    if (!evidence.file) return { photo: null, blobs: [] as PhotoBlob[] }
    const photo: PhotoRecord = { id: crypto.randomUUID(), ...links, type: evidence.photoType ?? "Material", caption: evidence.caption?.trim() ?? "", fileName: evidence.file.name, contentType: evidence.file.type || "application/octet-stream", blobKey: crypto.randomUUID(), takenAt: now, uploadedAt: now, operatorName }
    snapshot.photos.push(photo)
    return { photo, blobs: [{ key: photo.blobKey, blob: evidence.file }] }
  }

  function addEvidenceFiles(snapshot: InventorySnapshot, now: string, operatorName: string, evidence: MultipleEvidenceInput, links: Parameters<typeof addEvidence>[4]) {
    const records = evidenceFiles(evidence).map((file) => addEvidence(snapshot, now, operatorName, { file, photoType: evidence.photoType, caption: evidence.caption }, links))
    return {
      photos: records.flatMap((record) => record.photo ? [record.photo] : []),
      blobs: records.flatMap((record) => record.blobs),
    }
  }

  function createIssueRecord(snapshot: InventorySnapshot, now: string, input: RecordIssueInput, existingPhotoIds: string[] = []) {
    const operatorName = requiredName(input.operatorName)
    const idempotencyKey = input.clientMutationId.trim()
    if (!idempotencyKey) throw new Error("An Issue idempotency key is required.")
    const existing = snapshot.issues.find((issue) => issue.idempotencyKey === idempotencyKey)
    if (existing) return { issue: existing, blobs: [] as PhotoBlob[], created: false }
    const title = input.title.trim()
    if (!title) throw new Error("Issue title is required.")

    const project = input.projectId ? snapshot.projects.find((item) => item.id === input.projectId) : null
    const lot = input.lotId ? snapshot.lots.find((item) => item.id === input.lotId) : null
    const receipt = input.receiptId ? snapshot.receipts.find((item) => item.id === input.receiptId) : null
    const location = input.locationId ? snapshot.locations.find((item) => item.id === input.locationId) : null
    const movement = input.movementId ? snapshot.movements.find((item) => item.id === input.movementId) : null
    const outbound = input.outboundBatchId ? snapshot.outboundBatches.find((item) => item.id === input.outboundBatchId) : null
    if (input.projectId && !project) throw new Error("Linked project not found.")
    if (input.lotId && !lot) throw new Error("Linked material lot not found.")
    if (input.receiptId && !receipt) throw new Error("Linked receipt not found.")
    if (input.locationId && !location) throw new Error("Linked storage location not found.")
    if (input.movementId && !movement) throw new Error("Linked movement not found.")
    if (input.outboundBatchId && !outbound) throw new Error("Linked outbound batch not found.")
    const linkedSiteIds = [project?.siteId, lot?.siteId, receipt?.siteId, location?.siteId, movement?.siteId, outbound?.siteId].filter(Boolean)
    if (linkedSiteIds.some((siteId) => siteId !== input.siteId)) throw new Error("Issue links must belong to the selected site.")

    const issueId = crypto.randomUUID()
    const linkedPhotos = existingPhotoIds.map((photoId) => snapshot.photos.find((photo) => photo.id === photoId)).filter((photo): photo is PhotoRecord => Boolean(photo))
    if (linkedPhotos.length !== existingPhotoIds.length) throw new Error("One or more linked Issue photos were not found.")
    const evidence = addEvidence(snapshot, now, operatorName, { ...input, photoType: input.photoType ?? "Condition", caption: input.caption ?? input.description }, { siteId: input.siteId, projectId: input.projectId, lotId: input.lotId, receiptId: input.receiptId, movementId: input.movementId, outboundBatchId: input.outboundBatchId, issueId, locationId: input.locationId })
    const photoIds = [...new Set([...existingPhotoIds, ...(evidence.photo ? [evidence.photo.id] : [])])]
    const validDamageEvidence = photoIds.some((photoId) => {
      const photo = snapshot.photos.find((item) => item.id === photoId)
      return photo?.contentType.startsWith("image/")
    })
    if (input.type === "Damaged" && !validDamageEvidence) throw new Error("At least one damage photo is required for a Damaged Issue.")
    for (const photo of linkedPhotos) if (!photo.issueId) photo.issueId = issueId

    const issue = { id: issueId, siteId: input.siteId, projectId: input.projectId, lotId: input.lotId, receiptId: input.receiptId, locationId: input.locationId, movementId: input.movementId, outboundBatchId: input.outboundBatchId, type: input.type, priority: input.priority, status: "Open" as const, title, description: input.description.trim(), blocking: input.blocking, assigneeName: null, photoIds, resolutionNote: null, idempotencyKey, createdAt: now, updatedAt: now, operatorName }
    snapshot.issues.push(issue)
    snapshot.issueTransitions.push({ id: crypto.randomUUID(), issueId, kind: "Created", fromStatus: null, toStatus: "Open", note: input.description.trim(), occurredAt: now, operatorName, userId: null })
    snapshot.activities.push({ id: crypto.randomUUID(), siteId: input.siteId, projectId: input.projectId, entityType: "Issue", entityId: issueId, type: "Issue recorded", description: title, occurredAt: now, operatorName })
    return { issue, blobs: evidence.blobs, created: true }
  }

  return {
    load: async () => migrateInventorySnapshot(await persistence.load(seed)),
    getPhoto: (key: string) => persistence.getPhoto(key),
    updateProjectStatus(input: UpdateProjectStatusInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const project = snapshot.projects.find((item) => item.id === input.projectId)
        if (!project) throw new Error("Project not found.")
        if (project.version !== input.expectedVersion) throw new Error("Project stage changed after this page loaded. Review the current stage and try again.")
        if (project.status === input.status) throw new Error(`This project is already ${input.status}.`)
        const previousStatus = project.status
        project.status = input.status
        project.updatedAt = now
        project.version += 1
        const note = input.note.trim()
        if (note.length > 2000) throw new Error("Project stage notes cannot exceed 2,000 characters.")
        snapshot.activities.push({
          id: crypto.randomUUID(),
          siteId: project.siteId,
          projectId: project.id,
          entityType: "Project",
          entityId: project.id,
          type: "Project stage changed",
          description: `Project stage changed from ${previousStatus} to ${input.status}.${note ? ` ${note}` : ""}`,
          occurredAt: now,
          operatorName,
        })
        return { snapshot }
      })
    },
    addMaterial(input: AddMaterialInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const project = snapshot.projects.find((item) => item.id === input.projectId)
        if (!project) throw new Error("Project not found.")
        if (input.quantity !== null && (!Number.isInteger(input.quantity) || input.quantity < 0)) throw new Error("Quantity must be a whole number or unknown.")
        const group = { id: crypto.randomUUID(), projectId: project.id, name: input.materialName.trim(), description: input.description.trim() }
        if (!group.name) throw new Error("Material name is required.")
        const lotId = crypto.randomUUID()
        snapshot.groups.push(group)
        snapshot.lots.push({ id: lotId, projectId: project.id, groupId: group.id, siteId: project.siteId, locationId: input.locationId, position: position(input), packageType: input.packageType, quantity: input.quantity, presence: "Present", condition: input.condition, protection: input.protection, accessibility: input.accessibility, handlingRequirements: input.handlingRequirements.map((value) => value.trim()).filter(Boolean), parentLotId: null, rootLotId: lotId, createdAt: now, updatedAt: now, version: 1 })
        const evidence = addEvidence(snapshot, now, operatorName, input, { siteId: project.siteId, projectId: project.id, lotId, receiptId: null, movementId: null, outboundBatchId: null, issueId: null, locationId: input.locationId })
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: project.siteId, projectId: project.id, entityType: "Lot", entityId: lotId, type: "Material added", description: `${group.name} added as ${input.quantity ?? "unknown quantity of"} ${input.packageType.toLowerCase()} packages.`, occurredAt: now, operatorName })
        return { snapshot, blobs: evidence.blobs }
      })
    },
    verifyLot(input: VerifyLotInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const lot = snapshot.lots.find((item) => item.id === input.lotId)
        if (!lot) throw new Error("Material lot not found.")
        lot.locationId = input.locationId
        lot.position = position(input)
        lot.updatedAt = now
        lot.version += 1
        const evidence = addEvidence(snapshot, now, operatorName, input, { siteId: lot.siteId, projectId: lot.projectId, lotId: lot.id, receiptId: null, movementId: null, outboundBatchId: null, issueId: null, locationId: lot.locationId })
        snapshot.verifications.push({ id: crypto.randomUUID(), lotId: lot.id, verifiedAt: now, operatorName, locationId: lot.locationId, position: lot.position, note: input.note.trim(), photoIds: evidence.photo ? [evidence.photo.id] : [] })
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: lot.siteId, projectId: lot.projectId, entityType: "Lot", entityId: lot.id, type: "Verified", description: "Material presence and location confirmed.", occurredAt: now, operatorName })
        return { snapshot, blobs: evidence.blobs }
      })
    },
    recordIssue(input: RecordIssueInput) {
      return transact((snapshot, now) => {
        const result = createIssueRecord(snapshot, now, input)
        return { snapshot, blobs: result.blobs }
      })
    },
    assignIssue(input: AssignIssueInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const issue = snapshot.issues.find((item) => item.id === input.issueId)
        if (!issue) throw new Error("Issue not found.")
        const assigneeName = input.assigneeName.trim() || null
        if (issue.assigneeName === assigneeName) throw new Error(assigneeName ? "This Issue is already assigned to that name." : "This Issue is already unassigned.")
        const prior = issue.assigneeName
        issue.assigneeName = assigneeName
        issue.updatedAt = now
        const note = assigneeName ? `Assigned to ${assigneeName}.` : `Unassigned from ${prior}.`
        snapshot.issueTransitions.push({ id: crypto.randomUUID(), issueId: issue.id, kind: "Assigned", fromStatus: issue.status, toStatus: issue.status, note, occurredAt: now, operatorName, userId: null })
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: issue.siteId, projectId: issue.projectId, entityType: "Issue", entityId: issue.id, type: "Issue assigned", description: note, occurredAt: now, operatorName })
        return { snapshot }
      })
    },
    addIssueComment(input: AddIssueCommentInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const issue = snapshot.issues.find((item) => item.id === input.issueId)
        if (!issue) throw new Error("Issue not found.")
        const body = input.body.trim()
        if (!body && !input.file) throw new Error("Add a comment or photo before saving follow-up.")
        const evidence = addEvidence(snapshot, now, operatorName, { ...input, photoType: input.photoType ?? "Condition", caption: input.caption ?? body }, { siteId: issue.siteId, projectId: issue.projectId, lotId: issue.lotId, receiptId: issue.receiptId, movementId: issue.movementId, outboundBatchId: issue.outboundBatchId, issueId: issue.id, locationId: issue.locationId })
        const photoIds = evidence.photo ? [evidence.photo.id] : []
        snapshot.issueComments.push({ id: crypto.randomUUID(), issueId: issue.id, body, photoIds, createdAt: now, operatorName, userId: null })
        issue.photoIds.push(...photoIds)
        issue.updatedAt = now
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: issue.siteId, projectId: issue.projectId, entityType: "Issue", entityId: issue.id, type: "Issue commented", description: body || "Photo evidence added.", occurredAt: now, operatorName })
        return { snapshot, blobs: evidence.blobs }
      })
    },
    transitionIssue(input: TransitionIssueInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const issue = snapshot.issues.find((item) => item.id === input.issueId)
        if (!issue) throw new Error("Issue not found.")
        const note = input.note.trim()
        if (!note) throw new Error("A note is required for every Issue status change.")
        const allowed: Record<IssueStatus, IssueStatus[]> = {
          Open: ["In Progress", "Resolved", "Dismissed"],
          "In Progress": ["Open", "Resolved", "Dismissed"],
          Resolved: ["Open"],
          Dismissed: ["Open"],
        }
        if (!allowed[issue.status].includes(input.toStatus)) throw new Error(`An Issue cannot move from ${issue.status} to ${input.toStatus}.`)
        if ((input.toStatus === "Resolved" || input.toStatus === "Dismissed") && issue.type === "Damaged") {
          const hasDamagePhoto = issue.photoIds.some((photoId) => snapshot.photos.some((photo) => photo.id === photoId && photo.contentType.startsWith("image/")))
          if (!hasDamagePhoto) throw new Error("Add a damage photo before completing a Damaged Issue.")
        }
        if (input.toStatus === "Resolved" && issue.type === "Unknown shipment" && issue.receiptId) {
          const receipt = snapshot.receipts.find((item) => item.id === issue.receiptId)
          const project = input.resolvedProjectId ? snapshot.projects.find((item) => item.id === input.resolvedProjectId) : null
          if (!receipt) throw new Error("Linked receipt not found.")
          if (!project || project.siteId !== issue.siteId) throw new Error("Select the confirmed project before resolving an Unknown Shipment.")
          receipt.projectId = project.id
          receipt.identityState = "Matched"
          receipt.updatedAt = now
          issue.projectId = project.id
          snapshot.issueTransitions.push({ id: crypto.randomUUID(), issueId: issue.id, kind: "Linked", fromStatus: issue.status, toStatus: issue.status, note: `Linked receipt to ${project.name}. Original receiving evidence preserved.`, occurredAt: now, operatorName, userId: null })
        }
        const fromStatus = issue.status
        issue.status = input.toStatus
        issue.resolutionNote = input.toStatus === "Resolved" || input.toStatus === "Dismissed" ? note : null
        issue.updatedAt = now
        snapshot.issueTransitions.push({ id: crypto.randomUUID(), issueId: issue.id, kind: "Status changed", fromStatus, toStatus: issue.status, note, occurredAt: now, operatorName, userId: null })
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: issue.siteId, projectId: issue.projectId, entityType: "Issue", entityId: issue.id, type: "Issue status changed", description: `${issue.title}: ${fromStatus} to ${issue.status}.`, occurredAt: now, operatorName })
        return { snapshot }
      })
    },
    saveReceiptDraft(input: SaveReceiptDraftInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        if (!input.lines.length) throw new Error("Add at least one receipt line.")
        const existing = input.receiptId ? snapshot.receipts.find((receipt) => receipt.id === input.receiptId) : null
        if (existing?.status === "Received") throw new Error("A completed receipt cannot be edited.")
        const receiptId = existing?.id ?? crypto.randomUUID()
        const lineIds = input.lines.map((line) => line.id ?? crypto.randomUUID())
        const existingLinePhotos = new Map(snapshot.receiptLines.filter((line) => line.receiptId === receiptId).map((line) => [line.id, line.photoIds]))
        const selectedDocumentFiles = evidenceFiles({ files: input.documentFiles, file: input.documentFile })
        if ((existing?.documentPhotoIds.length ?? 0) + selectedDocumentFiles.length > 3) throw new Error("A receipt can have no more than 3 packing slip or document photos.")
        const documentEvidence = addEvidenceFiles(snapshot, now, operatorName, { files: selectedDocumentFiles, photoType: "Document", caption: "Receiving document" }, { siteId: input.siteId, projectId: input.projectId, lotId: null, receiptId, movementId: null, outboundBatchId: null, issueId: null, locationId: input.stagingLocationId })
        const labelEvidence = addEvidence(snapshot, now, operatorName, { file: input.labelFile, photoType: "Label", caption: input.handwrittenProjectText }, { siteId: input.siteId, projectId: input.projectId, lotId: null, receiptId, movementId: null, outboundBatchId: null, issueId: null, locationId: input.stagingLocationId })
        const linePhotos: string[][] = []
        const blobs = [...documentEvidence.blobs, ...labelEvidence.blobs]
        input.lines.forEach((line) => {
          const existingPhotos = existingLinePhotos.get(line.id ?? "") ?? []
          const selectedFiles = evidenceFiles(line)
          if (existingPhotos.length + selectedFiles.length > 3) throw new Error("Each receipt line can have no more than 3 material photos.")
          const evidence = addEvidenceFiles(snapshot, now, operatorName, { ...line, files: selectedFiles, file: null }, { siteId: input.siteId, projectId: input.projectId, lotId: null, receiptId, movementId: null, outboundBatchId: null, issueId: null, locationId: line.targetLocationId ?? input.stagingLocationId })
          linePhotos.push(evidence.photos.map((photo) => photo.id))
          blobs.push(...evidence.blobs)
        })
        snapshot.receiptLines = snapshot.receiptLines.filter((line) => line.receiptId !== receiptId)
        snapshot.receiptLines.push(...input.lines.map((line, index) => {
          if (!line.materialName.trim()) throw new Error(`Material name is required for line ${index + 1}.`)
          if (line.quantity !== null && (!Number.isInteger(line.quantity) || line.quantity < 0)) throw new Error(`Line ${index + 1} quantity must be a whole number or unknown.`)
          return { id: lineIds[index], receiptId, materialName: line.materialName.trim(), description: line.description.trim(), packageType: line.packageType, quantity: line.quantity, condition: line.condition, protection: line.protection, accessibility: line.accessibility, handlingRequirements: line.handlingRequirements.map((item) => item.trim()).filter(Boolean), targetLocationId: line.targetLocationId, photoIds: [...new Set([...(existingLinePhotos.get(line.id ?? "") ?? []), ...linePhotos[index]])] }
        }))
        const receipt = { id: receiptId, siteId: input.siteId, receiptNumber: input.receiptNumber.trim(), projectId: input.projectId, identityState: input.projectId ? "Matched" as const : "Unresolved" as const, inspectionState: input.inspectionState, status: "Draft" as const, handwrittenProjectText: input.handwrittenProjectText.trim(), physicalLabelApplied: input.physicalLabelApplied, labelPhotoId: labelEvidence.photo?.id ?? existing?.labelPhotoId ?? null, documentPhotoIds: [...(existing?.documentPhotoIds ?? []), ...documentEvidence.photos.map((photo) => photo.id)], lineIds, stagingLocationId: input.stagingLocationId, notes: input.notes.trim(), createdAt: existing?.createdAt ?? now, updatedAt: now, completedAt: null, operatorName }
        if (existing) Object.assign(existing, receipt); else snapshot.receipts.push(receipt)
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: input.siteId, projectId: input.projectId, entityType: "Receipt", entityId: receiptId, type: "Receipt draft saved", description: `Receiving draft ${input.receiptNumber.trim() || "without receipt number"} saved with ${input.lines.length} line${input.lines.length === 1 ? "" : "s"}.`, occurredAt: now, operatorName })
        return { snapshot, blobs }
      })
    },
    completeReceipt(receiptId: string, operator: string) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(operator)
        const receipt = snapshot.receipts.find((item) => item.id === receiptId)
        if (!receipt) throw new Error("Receipt draft not found.")
        if (receipt.status === "Received") throw new Error("This receipt is already complete.")
        const lines = snapshot.receiptLines.filter((line) => line.receiptId === receipt.id)
        if (!lines.length) throw new Error("Add at least one receipt line before receiving.")
        const missingPhotoIndex = lines.findIndex((line) => !line.photoIds.some((photoId) => snapshot.photos.some((photo) => photo.id === photoId && photo.receiptId === receipt.id && photo.type === "Material")))
        if (missingPhotoIndex >= 0) throw new Error(`Material photo is required for receipt line ${missingPhotoIndex + 1} before receiving.`)
        if (receipt.projectId) {
          const project = snapshot.projects.find((item) => item.id === receipt.projectId)
          if (!project) throw new Error("Matched project not found.")
          for (const line of lines) {
            const groupId = crypto.randomUUID(); const lotId = crypto.randomUUID(); const locationId = line.targetLocationId ?? receipt.stagingLocationId
            snapshot.groups.push({ id: groupId, projectId: project.id, name: line.materialName, description: line.description })
            snapshot.lots.push({ id: lotId, projectId: project.id, groupId, siteId: receipt.siteId, locationId, position: locationId ? { precision: "General", row: null, column: null, note: "Assigned during receiving" } : unknownPosition(), packageType: line.packageType, quantity: line.quantity, presence: "Present", condition: line.condition, protection: line.protection, accessibility: line.accessibility, handlingRequirements: line.handlingRequirements, parentLotId: null, rootLotId: lotId, createdAt: now, updatedAt: now, version: 1 })
            snapshot.verifications.push({ id: crypto.randomUUID(), lotId, verifiedAt: now, operatorName, locationId, position: locationId ? { precision: "General", row: null, column: null, note: "Assigned during receiving" } : unknownPosition(), note: `Created from receipt ${receipt.receiptNumber || receipt.id}.`, photoIds: line.photoIds })
            for (const photoId of line.photoIds) { const record = snapshot.photos.find((photo) => photo.id === photoId); if (record) { record.lotId = lotId; record.projectId = project.id } }
            if (line.condition === "Damaged") {
              createIssueRecord(snapshot, now, { siteId: receipt.siteId, projectId: project.id, lotId, receiptId: receipt.id, locationId, movementId: null, outboundBatchId: null, type: "Damaged", priority: "High", title: `Damage recorded during receiving: ${line.materialName}`, description: line.description, blocking: true, operatorName, clientMutationId: `receiving:${receipt.id}:damage:${line.id}` }, line.photoIds)
            }
          }
        } else {
          createIssueRecord(snapshot, now, { siteId: receipt.siteId, projectId: null, lotId: null, receiptId: receipt.id, locationId: receipt.stagingLocationId, movementId: null, outboundBatchId: null, type: "Unknown shipment", priority: "High", title: `Unknown shipment ${receipt.receiptNumber || receipt.id}`, description: receipt.handwrittenProjectText ? `Field label: ${receipt.handwrittenProjectText}` : "No project could be confirmed during receiving.", blocking: true, operatorName, clientMutationId: `receiving:${receipt.id}:unknown-shipment` })
        }
        receipt.status = "Received"; receipt.completedAt = now; receipt.updatedAt = now; receipt.operatorName = operatorName
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: receipt.siteId, projectId: receipt.projectId, entityType: "Receipt", entityId: receipt.id, type: "Received", description: receipt.projectId ? `${lines.length} receipt line${lines.length === 1 ? "" : "s"} received into material lots.` : "Unknown shipment received and preserved for resolution.", occurredAt: now, operatorName })
        return { snapshot }
      })
    },
    moveMaterial(input: MoveMaterialInput) {
      return transact((snapshot, now) => {
        if (snapshot.movements.some((movement) => movement.clientMutationId === input.clientMutationId)) return { snapshot }
        const operatorName = requiredName(input.operatorName)
        const reason = input.reason.trim()
        if (!reason) throw new Error("Movement reason is required.")
        if (!input.lines.length) throw new Error("Select at least one material lot.")
        if (new Set(input.lines.map((line) => line.lotId)).size !== input.lines.length) throw new Error("A material lot can only appear once in a movement.")
        const destination = snapshot.locations.find((location) => location.id === input.locationId)
        if (!destination) throw new Error("Destination location not found.")
        const destinationPosition = position(input)
        const selectedLots = input.lines.map((line) => {
          const lot = snapshot.lots.find((item) => item.id === line.lotId)
          if (!lot) throw new Error("Material lot not found.")
          return { lot, line }
        })
        const siteId = selectedLots[0].lot.siteId
        if (destination.siteId !== siteId || selectedLots.some(({ lot }) => lot.siteId !== siteId)) throw new Error("Cross-site movement requires an explicit inter-site transfer.")
        const movementId = crypto.randomUUID()
        const movementLines = selectedLots.map(({ lot, line }) => {
          if (lot.presence !== "Present") throw new Error("Removed or departed material cannot be moved.")
          if (activeOutboundLines(snapshot, lot.id).length) throw new Error("Material reserved for outbound cannot be moved. Cancel the active outbound batch first.")
          if (lot.version !== line.expectedVersion) throw new Error("Material changed after selection. Review the current lot before moving it.")
          if (lot.locationId === destination.id && samePosition(lot.position, destinationPosition)) throw new Error("Source and destination cannot be the same.")
          if (lot.quantity === null && line.quantity !== null) throw new Error("A lot with unknown quantity can only be moved in full.")
          if (lot.quantity !== null && (!Number.isInteger(line.quantity) || line.quantity === null || line.quantity <= 0 || line.quantity > lot.quantity)) throw new Error("Move quantity must be a positive whole number no greater than the lot quantity.")

          const sourceLocationId = lot.locationId
          const sourcePosition = structuredClone(lot.position)
          const fullMove = lot.quantity === null || line.quantity === lot.quantity
          let resultingLot: MaterialLot
          if (fullMove) {
            lot.locationId = destination.id
            lot.position = structuredClone(destinationPosition)
            lot.updatedAt = now
            lot.version += 1
            resultingLot = lot
          } else {
            lot.quantity = (lot.quantity ?? 0) - (line.quantity ?? 0)
            lot.updatedAt = now
            lot.version += 1
            const childId = crypto.randomUUID()
            resultingLot = { ...structuredClone(lot), id: childId, quantity: line.quantity, locationId: destination.id, position: structuredClone(destinationPosition), parentLotId: lot.id, rootLotId: lot.rootLotId, createdAt: now, updatedAt: now, version: 1, migrationNote: undefined }
            snapshot.lots.push(resultingLot)
          }
          return { id: crypto.randomUUID(), movementId, sourceLotId: lot.id, resultingLotId: resultingLot.id, sourceLocationId, sourcePosition, destinationLocationId: destination.id, destinationPosition: structuredClone(destinationPosition), quantity: line.quantity, resultingLotVersion: resultingLot.version }
        })
        const projectIds = [...new Set(selectedLots.map(({ lot }) => lot.projectId))]
        const evidence = addEvidenceFiles(snapshot, now, operatorName, { files: evidenceFiles(input), photoType: "Location", caption: input.note }, { siteId, projectId: projectIds.length === 1 ? projectIds[0] : null, lotId: null, receiptId: null, movementId, outboundBatchId: null, issueId: null, locationId: destination.id })
        snapshot.movements.push({ id: movementId, siteId, kind: "Move", reason, note: input.note.trim(), operatorName, occurredAt: now, photoId: evidence.photos[0]?.id ?? null, clientMutationId: input.clientMutationId, reversalOfMovementId: null })
        snapshot.movementLines.push(...movementLines)
        snapshot.activities.push({ id: crypto.randomUUID(), siteId, projectId: projectIds.length === 1 ? projectIds[0] : null, entityType: "Movement", entityId: movementId, type: "Material moved", description: `${movementLines.length} material lot${movementLines.length === 1 ? "" : "s"} moved to ${destination.name}.`, occurredAt: now, operatorName })
        return { snapshot, blobs: evidence.blobs }
      })
    },
    reverseMovement(input: ReverseMovementInput) {
      return transact((snapshot, now) => {
        if (snapshot.movements.some((movement) => movement.clientMutationId === input.clientMutationId)) return { snapshot }
        const operatorName = requiredName(input.operatorName)
        const original = snapshot.movements.find((movement) => movement.id === input.movementId)
        if (!original || original.kind !== "Move") throw new Error("Original movement not found.")
        if (snapshot.movements.some((movement) => movement.reversalOfMovementId === original.id)) throw new Error("This movement has already been reversed.")
        const originalLines = snapshot.movementLines.filter((line) => line.movementId === original.id)
        if (!originalLines.length) throw new Error("Original movement lines not found.")
        const movementId = crypto.randomUUID()
        const reversalLines = originalLines.map((line) => {
          const lot = snapshot.lots.find((item) => item.id === line.resultingLotId)
          if (!lot || lot.presence !== "Present") throw new Error("Moved material is no longer available for reversal.")
          if (lot.version !== line.resultingLotVersion || lot.locationId !== line.destinationLocationId || !samePosition(lot.position, line.destinationPosition)) throw new Error("Moved material changed after this movement and cannot be reversed automatically.")
          const fromLocationId = lot.locationId
          const fromPosition = structuredClone(lot.position)
          lot.locationId = line.sourceLocationId
          lot.position = structuredClone(line.sourcePosition)
          lot.updatedAt = now
          lot.version += 1
          return { id: crypto.randomUUID(), movementId, sourceLotId: lot.id, resultingLotId: lot.id, sourceLocationId: fromLocationId, sourcePosition: fromPosition, destinationLocationId: line.sourceLocationId, destinationPosition: structuredClone(line.sourcePosition), quantity: line.quantity, resultingLotVersion: lot.version }
        })
        snapshot.movements.push({ id: movementId, siteId: original.siteId, kind: "Reversal", reason: `Reversal: ${original.reason}`, note: input.note.trim(), operatorName, occurredAt: now, photoId: null, clientMutationId: input.clientMutationId, reversalOfMovementId: original.id })
        snapshot.movementLines.push(...reversalLines)
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: original.siteId, projectId: null, entityType: "Movement", entityId: movementId, type: "Movement reversed", description: `${reversalLines.length} material lot${reversalLines.length === 1 ? "" : "s"} returned to the recorded source.`, occurredAt: now, operatorName })
        return { snapshot }
      })
    },
    createOutboundBatch(input: CreateOutboundBatchInput) {
      return transact((snapshot, now) => {
        const existing = snapshot.outboundBatches.find((batch) => batch.clientMutationId === input.clientMutationId)
        if (existing) return { snapshot }
        const operatorName = requiredName(input.operatorName)
        if (!input.clientMutationId.trim()) throw new Error("A client mutation ID is required.")
        if (!input.lines.length) throw new Error("Select at least one material lot.")
        if (new Set(input.lines.map((line) => line.lotId)).size !== input.lines.length) throw new Error("A material lot can only appear once in an outbound batch.")
        const project = snapshot.projects.find((item) => item.id === input.projectId)
        if (!project) throw new Error("Project not found.")
        const batchId = crypto.randomUUID()
        const outboundLines = input.lines.map((line) => {
          const lot = snapshot.lots.find((item) => item.id === line.lotId)
          if (!lot || lot.projectId !== project.id || lot.siteId !== project.siteId) throw new Error("Selected material does not belong to this project and site.")
          if (lot.presence !== "Present") throw new Error("Removed or departed material cannot be prepared for outbound.")
          if (lot.version !== line.expectedVersion) throw new Error("Material changed after selection. Review the current lot before planning outbound.")
          if (activeOutboundLines(snapshot, lot.id).length) throw new Error("This material is already reserved in an active outbound batch.")
          if (lot.quantity === null && line.quantity !== null) throw new Error("A lot with unknown quantity can only be reserved in full.")
          if (lot.quantity !== null && (!Number.isInteger(line.quantity) || line.quantity === null || line.quantity <= 0 || line.quantity > lot.quantity)) throw new Error("Outbound quantity must be a positive whole number no greater than the lot quantity.")
          const group = snapshot.groups.find((item) => item.id === lot.groupId)
          return { id: crypto.randomUUID(), batchId, sourceLotId: lot.id, resultingLotId: null, quantity: line.quantity, sourceLotVersion: lot.version, sourceLocationId: lot.locationId, sourcePosition: structuredClone(lot.position), materialName: group?.name ?? "Material lot", packageType: lot.packageType, handlingRequirements: [...lot.handlingRequirements], resultingLotVersion: null }
        })
        snapshot.outboundBatches.push({ id: batchId, siteId: project.siteId, projectId: project.id, state: "Planned", operatorName, carrierReference: "", driverReference: "", note: "", plannedAt: now, readyAt: null, departedAt: null, cancelledAt: null, reversedAt: null, photoIds: [], clientMutationId: input.clientMutationId, processedMutationIds: [input.clientMutationId], reversalOfBatchId: null })
        snapshot.outboundLines.push(...outboundLines)
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: project.siteId, projectId: project.id, entityType: "Outbound", entityId: batchId, type: "Outbound planned", description: `${outboundLines.length} material lot${outboundLines.length === 1 ? "" : "s"} reserved for outbound.`, occurredAt: now, operatorName })
        return { snapshot }
      })
    },
    markOutboundReady(input: MarkOutboundReadyInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
        if (!batch) throw new Error("Outbound batch not found.")
        if (batch.processedMutationIds.includes(input.clientMutationId)) return { snapshot }
        if (batch.state !== "Planned") throw new Error("Only a planned outbound batch can be marked ready.")
        const blockingIssues = snapshot.issues.filter((issue) => issue.projectId === batch.projectId && isIssueActive(issue) && issue.blocking)
        if (blockingIssues.length) throw new Error("Resolve the project's blocking issues before marking outbound material ready.")
        const lines = snapshot.outboundLines.filter((line) => line.batchId === batch.id)
        if (!lines.length) throw new Error("Outbound batch lines not found.")
        for (const line of lines) {
          const lot = snapshot.lots.find((item) => item.id === line.sourceLotId)
          if (!lot || lot.presence !== "Present") throw new Error("Selected outbound material is no longer present.")
          if (lot.quantity === null ? line.quantity !== null : line.quantity === null || line.quantity > lot.quantity) throw new Error("Selected outbound quantity is no longer available.")
          if (lotVerificationState(snapshot, lot, new Date(now)).label !== "Verified") throw new Error("Confirm every selected lot before marking this batch ready.")
          line.sourceLotVersion = lot.version
          line.sourceLocationId = lot.locationId
          line.sourcePosition = structuredClone(lot.position)
        }
        batch.state = "Ready"
        batch.readyAt = now
        batch.processedMutationIds.push(input.clientMutationId)
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: batch.siteId, projectId: batch.projectId, entityType: "Outbound", entityId: batch.id, type: "Outbound ready", description: `${lines.length} material lot${lines.length === 1 ? "" : "s"} confirmed ready for pickup.`, occurredAt: now, operatorName })
        return { snapshot }
      })
    },
    departOutboundBatch(input: DepartOutboundBatchInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
        if (!batch) throw new Error("Outbound batch not found.")
        if (batch.processedMutationIds.includes(input.clientMutationId)) return { snapshot }
        if (batch.state !== "Ready") throw new Error("Only a ready outbound batch can depart.")
        const lines = snapshot.outboundLines.filter((line) => line.batchId === batch.id)
        if (!lines.length) throw new Error("Outbound batch lines not found.")
        for (const line of lines) {
          const lot = snapshot.lots.find((item) => item.id === line.sourceLotId)
          if (!lot || lot.presence !== "Present") throw new Error("Selected outbound material is no longer present.")
          if (lot.version !== line.sourceLotVersion) throw new Error("Material changed after readiness confirmation. Review the batch before departure.")
          const fullDeparture = lot.quantity === null || line.quantity === lot.quantity
          let departedLot: MaterialLot
          if (fullDeparture) {
            lot.presence = "Removed"
            lot.updatedAt = now
            lot.version += 1
            departedLot = lot
          } else {
            if (line.quantity === null || lot.quantity === null || line.quantity <= 0 || line.quantity > lot.quantity) throw new Error("Selected outbound quantity is no longer available.")
            lot.quantity -= line.quantity
            lot.updatedAt = now
            lot.version += 1
            const childId = crypto.randomUUID()
            departedLot = { ...structuredClone(lot), id: childId, quantity: line.quantity, presence: "Removed", parentLotId: lot.id, rootLotId: lot.rootLotId, createdAt: now, updatedAt: now, version: 1, migrationNote: undefined }
            snapshot.lots.push(departedLot)
          }
          line.resultingLotId = departedLot.id
          line.resultingLotVersion = departedLot.version
        }
        const evidence = addEvidence(snapshot, now, operatorName, { file: input.file, photoType: "Material", caption: input.note }, { siteId: batch.siteId, projectId: batch.projectId, lotId: null, receiptId: null, movementId: null, outboundBatchId: batch.id, issueId: null, locationId: null })
        batch.state = "Departed"
        batch.departedAt = now
        batch.carrierReference = input.carrierReference.trim()
        batch.driverReference = input.driverReference.trim()
        batch.note = input.note.trim()
        batch.photoIds.push(...(evidence.photo ? [evidence.photo.id] : []))
        batch.processedMutationIds.push(input.clientMutationId)
        const project = snapshot.projects.find((item) => item.id === batch.projectId)
        if (project) project.updatedAt = now
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: batch.siteId, projectId: batch.projectId, entityType: "Outbound", entityId: batch.id, type: "Outbound departed", description: `${lines.length} material lot${lines.length === 1 ? "" : "s"} recorded as departed.`, occurredAt: now, operatorName })
        return { snapshot, blobs: evidence.blobs }
      })
    },
    cancelOutboundBatch(input: CancelOutboundBatchInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
        if (!batch) throw new Error("Outbound batch not found.")
        if (batch.processedMutationIds.includes(input.clientMutationId)) return { snapshot }
        if (batch.state !== "Planned" && batch.state !== "Ready") throw new Error("Only a planned or ready outbound batch can be cancelled.")
        batch.state = "Cancelled"
        batch.cancelledAt = now
        batch.note = input.note.trim()
        batch.processedMutationIds.push(input.clientMutationId)
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: batch.siteId, projectId: batch.projectId, entityType: "Outbound", entityId: batch.id, type: "Outbound cancelled", description: "Outbound reservation cancelled and material released.", occurredAt: now, operatorName })
        return { snapshot }
      })
    },
    reverseOutboundBatch(input: ReverseOutboundBatchInput) {
      return transact((snapshot, now) => {
        const operatorName = requiredName(input.operatorName)
        const original = snapshot.outboundBatches.find((item) => item.id === input.batchId)
        if (!original || original.state !== "Departed") throw new Error("Departed outbound batch not found.")
        const existing = snapshot.outboundBatches.find((batch) => batch.reversalOfBatchId === original.id)
        if (existing?.clientMutationId === input.clientMutationId) return { snapshot }
        if (existing) throw new Error("This outbound departure has already been reversed.")
        const originalLines = snapshot.outboundLines.filter((line) => line.batchId === original.id)
        if (!originalLines.length) throw new Error("Outbound batch lines not found.")
        const reversalId = crypto.randomUUID()
        const reversalLines = originalLines.map((line) => {
          const lot = snapshot.lots.find((item) => item.id === line.resultingLotId)
          if (!lot || lot.presence !== "Removed") throw new Error("Departed material is no longer available for reversal.")
          if (line.resultingLotVersion === null || lot.version !== line.resultingLotVersion) throw new Error("Departed material changed after departure and cannot be reversed automatically.")
          const sourceVersion = lot.version
          lot.presence = "Present"
          lot.locationId = line.sourceLocationId
          lot.position = structuredClone(line.sourcePosition)
          lot.updatedAt = now
          lot.version += 1
          return { id: crypto.randomUUID(), batchId: reversalId, sourceLotId: line.sourceLotId, resultingLotId: lot.id, quantity: line.quantity, sourceLotVersion: sourceVersion, sourceLocationId: line.sourceLocationId, sourcePosition: structuredClone(line.sourcePosition), materialName: line.materialName, packageType: line.packageType, handlingRequirements: [...line.handlingRequirements], resultingLotVersion: lot.version }
        })
        snapshot.outboundBatches.push({ id: reversalId, siteId: original.siteId, projectId: original.projectId, state: "Reversed", operatorName, carrierReference: original.carrierReference, driverReference: original.driverReference, note: input.note.trim(), plannedAt: now, readyAt: null, departedAt: null, cancelledAt: null, reversedAt: now, photoIds: [], clientMutationId: input.clientMutationId, processedMutationIds: [input.clientMutationId], reversalOfBatchId: original.id })
        snapshot.outboundLines.push(...reversalLines)
        const project = snapshot.projects.find((item) => item.id === original.projectId)
        if (project) project.updatedAt = now
        snapshot.activities.push({ id: crypto.randomUUID(), siteId: original.siteId, projectId: original.projectId, entityType: "Outbound", entityId: reversalId, type: "Outbound reversed", description: `${reversalLines.length} departed material lot${reversalLines.length === 1 ? "" : "s"} restored through reversal.`, occurredAt: now, operatorName })
        return { snapshot }
      })
    },
    async exportBackup() {
      const snapshot = await persistence.load(seed)
      const photos = await Promise.all((await persistence.getAllPhotos()).map(async ({ key, blob }) => ({ key, contentType: blob.type, base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())), checksum: await sha256(blob) })))
      const archive: BackupArchive = { format: "tbs-operations-inventory-backup", formatVersion: 1, exportedAt: new Date().toISOString(), snapshot, photos }
      return new Blob([JSON.stringify(archive)], { type: "application/json" })
    },
    async importBackup(file: File) {
      const archive = JSON.parse(await file.text()) as BackupArchive
      if (archive.format !== "tbs-operations-inventory-backup" || archive.formatVersion !== 1) throw new Error("This is not a supported TBS Operations backup.")
      const snapshot = migrateInventorySnapshot(archive.snapshot)
      const blobs = await Promise.all(archive.photos.map(async (photo) => {
        const blob = base64ToBlob(photo.base64, photo.contentType)
        if (await sha256(blob) !== photo.checksum) throw new Error(`Photo checksum failed for ${photo.key}.`)
        return { key: photo.key, blob }
      }))
      const photoKeys = new Set(blobs.map((item) => item.key))
      if (snapshot.photos.some((photo) => !photoKeys.has(photo.blobKey))) throw new Error("Backup is missing one or more photo files.")
      await persistence.replace({ ...snapshot, revision: snapshot.revision + 1 }, blobs)
      return { ...snapshot, revision: snapshot.revision + 1 }
    },
  }
}

export type InventoryService = ReturnType<typeof createInventoryService>
