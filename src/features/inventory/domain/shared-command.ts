import { z } from "zod"

import {
  accessibilityStates,
  conditionStates,
  issuePriorities,
  issueStatuses,
  issueTypes,
  packageTypes,
  photoTypes,
  positionPrecisions,
  protectionStates,
  projectStatuses,
} from "@/features/inventory/domain/inventory"

const uuid = z.string().uuid()
const nullableUuid = uuid.nullable()
const upload = z.object({
  id: uuid,
  fileName: z.string().min(1),
  photoType: z.enum(photoTypes).optional(),
  caption: z.string().optional(),
})
const uploads = z.array(upload).max(3)
const position = {
  locationId: nullableUuid,
  precision: z.enum(positionPrecisions),
  row: z.enum(["Front", "Middle", "Back"]).nullable().optional(),
  column: z.enum(["Left", "Center", "Right"]).nullable().optional(),
  positionNote: z.string().optional(),
}
const lotLine = z.object({
  lotId: uuid,
  quantity: z.number().int().positive().nullable(),
  expectedVersion: z.number().int().positive(),
})

const schemas = {
  "project.status.update": z.object({
    projectId: uuid,
    status: z.enum(projectStatuses),
    expectedVersion: z.number().int().positive(),
    note: z.string().max(2000),
  }),
  "material.add": z.object({
    projectId: uuid,
    materialName: z.string().trim().min(1),
    description: z.string(),
    packageType: z.enum(packageTypes),
    quantity: z.number().int().nonnegative().nullable(),
    condition: z.enum(conditionStates),
    protection: z.enum(protectionStates),
    accessibility: z.enum(accessibilityStates),
    handlingRequirements: z.array(z.string()),
    ...position,
    photoUpload: upload.nullable().optional(),
  }),
  "verification.confirm": z.object({
    lotId: uuid,
    expectedVersion: z.number().int().positive(),
    note: z.string(),
    ...position,
    photoUpload: upload.nullable().optional(),
  }),
  "issue.record": z.object({
    projectId: nullableUuid,
    lotId: nullableUuid,
    receiptId: nullableUuid,
    locationId: nullableUuid,
    movementId: nullableUuid,
    outboundBatchId: nullableUuid,
    type: z.enum(issueTypes),
    priority: z.enum(issuePriorities),
    title: z.string().trim().min(1),
    description: z.string(),
    blocking: z.boolean(),
    clientMutationId: uuid,
    photoUpload: upload.nullable().optional(),
  }),
  "issue.assign": z.object({ issueId: uuid, assigneeName: z.string() }),
  "issue.comment": z.object({ issueId: uuid, body: z.string(), photoUpload: upload.nullable().optional() }),
  "issue.transition": z.object({
    issueId: uuid,
    toStatus: z.enum(issueStatuses),
    note: z.string().trim().min(1),
    resolvedProjectId: nullableUuid.optional(),
  }),
  "receipt.save-draft": z.object({
    receiptId: uuid,
    receiptNumber: z.string(),
    projectId: nullableUuid,
    inspectionState: z.enum(["Pending", "Passed", "Exception"]),
    handwrittenProjectText: z.string(),
    physicalLabelApplied: z.boolean(),
    stagingLocationId: nullableUuid,
    notes: z.string(),
    documentUpload: upload.nullable().optional(),
    documentUploads: uploads.optional(),
    labelUpload: upload.nullable().optional(),
    lines: z.array(z.object({
      id: uuid,
      materialName: z.string().trim().min(1),
      description: z.string(),
      packageType: z.enum(packageTypes),
      quantity: z.number().int().nonnegative().nullable(),
      condition: z.enum(conditionStates),
      protection: z.enum(protectionStates),
      accessibility: z.enum(accessibilityStates),
      handlingRequirements: z.array(z.string()),
      targetLocationId: nullableUuid,
      photoUpload: upload.nullable().optional(),
      photoUploads: uploads.optional(),
    })).min(1),
  }),
  "receipt.complete": z.object({ receiptId: uuid }),
  "movement.create": z.object({
    reason: z.string().trim().min(1),
    note: z.string(),
    ...position,
    locationId: uuid,
    lines: z.array(lotLine).min(1),
    photoUpload: upload.nullable().optional(),
    photoUploads: uploads.optional(),
  }),
  "movement.reverse": z.object({ movementId: uuid, note: z.string() }),
  "outbound.plan": z.object({ projectId: uuid, lines: z.array(lotLine).min(1) }),
  "outbound.ready": z.object({ batchId: uuid }),
  "outbound.depart": z.object({
    batchId: uuid,
    carrierReference: z.string(),
    driverReference: z.string(),
    note: z.string(),
    photoUpload: upload.nullable().optional(),
  }),
  "outbound.cancel": z.object({ batchId: uuid, note: z.string() }),
  "outbound.reverse": z.object({ batchId: uuid, note: z.string() }),
} as const

export type InventoryCommandType = keyof typeof schemas

const envelope = z.object({
  commandId: uuid,
  commandType: z.enum(Object.keys(schemas) as [InventoryCommandType, ...InventoryCommandType[]]),
  siteId: uuid,
  payload: z.unknown(),
})

export function parseInventoryCommand(value: unknown) {
  const parsed = envelope.parse(value)
  return {
    ...parsed,
    payload: schemas[parsed.commandType].parse(parsed.payload),
  }
}

export type StagedPhoto = z.infer<typeof upload>
