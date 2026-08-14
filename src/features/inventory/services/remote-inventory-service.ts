"use client"

import { inventorySnapshotSchema, type InventorySnapshot, type PhotoType } from "@/features/inventory/domain/inventory"
import type { StagedPhoto, InventoryCommandType } from "@/features/inventory/domain/shared-command"
import type {
  AddIssueCommentInput,
  AddMaterialInput,
  AssignIssueInput,
  CancelOutboundBatchInput,
  CreateOutboundBatchInput,
  DepartOutboundBatchInput,
  MarkOutboundReadyInput,
  MoveMaterialInput,
  RecordIssueInput,
  ReverseMovementInput,
  ReverseOutboundBatchInput,
  SaveReceiptDraftInput,
  TransitionIssueInput,
  VerifyLotInput,
} from "@/features/inventory/services/inventory-service"

type CommandResult = { entityId?: string; receiptId?: string; lineIds?: string[]; duplicate?: boolean }

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(body.error ?? "The shared Inventory request failed.")
  return body
}

export async function loadRemoteInventorySnapshot() {
  const response = await fetch("/api/inventory/snapshot", { cache: "no-store" })
  return inventorySnapshotSchema.parse(await responseJson<unknown>(response))
}

async function stagePhoto(
  commandId: string,
  siteId: string,
  file: File | null | undefined,
  photoType: PhotoType,
  caption: string,
): Promise<StagedPhoto | null> {
  if (!file) return null
  const uploadId = crypto.randomUUID()
  const form = new FormData()
  form.set("commandId", commandId)
  form.set("siteId", siteId)
  form.set("uploadId", uploadId)
  form.set("file", file)
  const response = await fetch("/api/inventory/uploads", { method: "POST", body: form })
  const uploaded = await responseJson<{ id: string; fileName: string }>(response)
  return { id: uploaded.id, fileName: uploaded.fileName, photoType, caption }
}

async function stagePhotos(
  commandId: string,
  siteId: string,
  files: File[],
  photoType: PhotoType,
  caption: string,
) {
  const selected = files.filter((file) => file.size > 0)
  if (selected.length > 3) throw new Error("Select no more than 3 photos.")
  const uploads = await Promise.all(selected.map((file) => stagePhoto(commandId, siteId, file, photoType, caption)))
  return uploads.filter((upload): upload is StagedPhoto => Boolean(upload))
}

async function executeCommand(
  commandId: string,
  commandType: InventoryCommandType,
  siteId: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch("/api/inventory/commands/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commandId, commandType, siteId, payload }),
  })
  return responseJson<CommandResult>(response)
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message)
  return value
}

function commandId(value?: string) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : crypto.randomUUID()
}

export function createRemoteInventoryService(getSnapshot: () => InventorySnapshot) {
  async function refresh() {
    return loadRemoteInventorySnapshot()
  }

  return {
    load: loadRemoteInventorySnapshot,
    async getPhoto(path: string) {
      const response = await fetch(`/api/inventory/media?path=${encodeURIComponent(path)}`, { cache: "no-store" })
      if (response.status === 404) return null
      if (!response.ok) throw new Error("Photo could not be opened.")
      return response.blob()
    },
    async addMaterial(input: AddMaterialInput) {
      const project = required(getSnapshot().projects.find((item) => item.id === input.projectId), "Project not found.")
      const id = commandId()
      const photoUpload = await stagePhoto(id, project.siteId, input.file, input.photoType ?? "Material", input.caption ?? input.description)
      await executeCommand(id, "material.add", project.siteId, {
        projectId: input.projectId,
        materialName: input.materialName,
        description: input.description,
        packageType: input.packageType,
        quantity: input.quantity,
        condition: input.condition,
        protection: input.protection,
        accessibility: input.accessibility,
        handlingRequirements: input.handlingRequirements,
        locationId: input.locationId,
        precision: input.precision,
        row: input.row ?? null,
        column: input.column ?? null,
        positionNote: input.positionNote ?? "",
        photoUpload,
      })
      return refresh()
    },
    async verifyLot(input: VerifyLotInput) {
      const lot = required(getSnapshot().lots.find((item) => item.id === input.lotId), "Material lot not found.")
      const id = commandId()
      const photoUpload = await stagePhoto(id, lot.siteId, input.file, input.photoType ?? "Location", input.caption ?? input.note)
      await executeCommand(id, "verification.confirm", lot.siteId, {
        lotId: input.lotId,
        expectedVersion: lot.version,
        note: input.note,
        locationId: input.locationId,
        precision: input.precision,
        row: input.row ?? null,
        column: input.column ?? null,
        positionNote: input.positionNote ?? "",
        photoUpload,
      })
      return refresh()
    },
    async recordIssue(input: RecordIssueInput) {
      const id = commandId(input.clientMutationId)
      const photoUpload = await stagePhoto(id, input.siteId, input.file, input.photoType ?? "Condition", input.caption ?? input.description)
      await executeCommand(id, "issue.record", input.siteId, {
        projectId: input.projectId,
        lotId: input.lotId,
        receiptId: input.receiptId,
        locationId: input.locationId,
        movementId: input.movementId,
        outboundBatchId: input.outboundBatchId,
        type: input.type,
        priority: input.priority,
        title: input.title,
        description: input.description,
        blocking: input.blocking,
        clientMutationId: id,
        photoUpload,
      })
      return refresh()
    },
    async assignIssue(input: AssignIssueInput) {
      const issue = required(getSnapshot().issues.find((item) => item.id === input.issueId), "Issue not found.")
      const id = commandId()
      await executeCommand(id, "issue.assign", issue.siteId, { issueId: input.issueId, assigneeName: input.assigneeName })
      return refresh()
    },
    async addIssueComment(input: AddIssueCommentInput) {
      const issue = required(getSnapshot().issues.find((item) => item.id === input.issueId), "Issue not found.")
      const id = commandId()
      const photoUpload = await stagePhoto(id, issue.siteId, input.file, input.photoType ?? "Condition", input.caption ?? input.body)
      await executeCommand(id, "issue.comment", issue.siteId, { issueId: input.issueId, body: input.body, photoUpload })
      return refresh()
    },
    async transitionIssue(input: TransitionIssueInput) {
      const issue = required(getSnapshot().issues.find((item) => item.id === input.issueId), "Issue not found.")
      const id = commandId()
      await executeCommand(id, "issue.transition", issue.siteId, {
        issueId: input.issueId,
        toStatus: input.toStatus,
        note: input.note,
        resolvedProjectId: input.resolvedProjectId ?? null,
      })
      return refresh()
    },
    async saveReceiptDraft(input: SaveReceiptDraftInput) {
      const id = commandId()
      const receiptId = input.receiptId ?? crypto.randomUUID()
      const documentUpload = await stagePhoto(id, input.siteId, input.documentFile, "Document", "Receiving document")
      const labelUpload = await stagePhoto(id, input.siteId, input.labelFile, "Label", input.handwrittenProjectText)
      const lines = await Promise.all(input.lines.map(async (line) => ({
        id: line.id ?? crypto.randomUUID(),
        materialName: line.materialName,
        description: line.description,
        packageType: line.packageType,
        quantity: line.quantity,
        condition: line.condition,
        protection: line.protection,
        accessibility: line.accessibility,
        handlingRequirements: line.handlingRequirements,
        targetLocationId: line.targetLocationId,
        photoUploads: await stagePhotos(id, input.siteId, [...(line.files ?? []), ...(line.file ? [line.file] : [])], line.photoType ?? "Material", line.caption ?? line.materialName),
      })))
      await executeCommand(id, "receipt.save-draft", input.siteId, {
        receiptId,
        receiptNumber: input.receiptNumber,
        projectId: input.projectId,
        inspectionState: input.inspectionState,
        handwrittenProjectText: input.handwrittenProjectText,
        physicalLabelApplied: input.physicalLabelApplied,
        stagingLocationId: input.stagingLocationId,
        notes: input.notes,
        documentUpload,
        labelUpload,
        lines,
      })
      return refresh()
    },
    async completeReceipt(receiptId: string) {
      const receipt = required(getSnapshot().receipts.find((item) => item.id === receiptId), "Receipt not found.")
      await executeCommand(commandId(), "receipt.complete", receipt.siteId, { receiptId })
      return refresh()
    },
    async moveMaterial(input: MoveMaterialInput) {
      const lot = required(getSnapshot().lots.find((item) => item.id === input.lines[0]?.lotId), "Material lot not found.")
      const id = commandId(input.clientMutationId)
      const photoUploads = await stagePhotos(id, lot.siteId, [...(input.files ?? []), ...(input.file ? [input.file] : [])], input.photoType ?? "Location", input.caption ?? input.note)
      await executeCommand(id, "movement.create", lot.siteId, {
        locationId: input.locationId,
        precision: input.precision,
        row: input.row ?? null,
        column: input.column ?? null,
        positionNote: input.positionNote ?? "",
        reason: input.reason,
        note: input.note,
        lines: input.lines,
        photoUploads,
      })
      return refresh()
    },
    async reverseMovement(input: ReverseMovementInput) {
      const movement = required(getSnapshot().movements.find((item) => item.id === input.movementId), "Movement not found.")
      await executeCommand(commandId(input.clientMutationId), "movement.reverse", movement.siteId, { movementId: input.movementId, note: input.note })
      return refresh()
    },
    async createOutboundBatch(input: CreateOutboundBatchInput) {
      const project = required(getSnapshot().projects.find((item) => item.id === input.projectId), "Project not found.")
      await executeCommand(commandId(input.clientMutationId), "outbound.plan", project.siteId, { projectId: input.projectId, lines: input.lines })
      return refresh()
    },
    async markOutboundReady(input: MarkOutboundReadyInput) {
      const batch = required(getSnapshot().outboundBatches.find((item) => item.id === input.batchId), "Outbound batch not found.")
      await executeCommand(commandId(input.clientMutationId), "outbound.ready", batch.siteId, { batchId: input.batchId })
      return refresh()
    },
    async departOutboundBatch(input: DepartOutboundBatchInput) {
      const batch = required(getSnapshot().outboundBatches.find((item) => item.id === input.batchId), "Outbound batch not found.")
      const id = commandId(input.clientMutationId)
      const photoUpload = await stagePhoto(id, batch.siteId, input.file, input.photoType ?? "Material", input.caption ?? input.note)
      await executeCommand(id, "outbound.depart", batch.siteId, {
        batchId: input.batchId,
        carrierReference: input.carrierReference,
        driverReference: input.driverReference,
        note: input.note,
        photoUpload,
      })
      return refresh()
    },
    async cancelOutboundBatch(input: CancelOutboundBatchInput) {
      const batch = required(getSnapshot().outboundBatches.find((item) => item.id === input.batchId), "Outbound batch not found.")
      await executeCommand(commandId(input.clientMutationId), "outbound.cancel", batch.siteId, { batchId: input.batchId, note: input.note })
      return refresh()
    },
    async reverseOutboundBatch(input: ReverseOutboundBatchInput) {
      const batch = required(getSnapshot().outboundBatches.find((item) => item.id === input.batchId), "Outbound batch not found.")
      await executeCommand(commandId(input.clientMutationId), "outbound.reverse", batch.siteId, { batchId: input.batchId, note: input.note })
      return refresh()
    },
    async exportBackup() {
      throw new Error("Shared backup export is available to Administrators from the migration tools.")
    },
    async importBackup() {
      throw new Error("Shared backup import is restricted to the Administrator migration workflow.")
    },
  }
}
