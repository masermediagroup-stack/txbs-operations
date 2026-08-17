import { z } from "zod"

export const INVENTORY_SCHEMA_VERSION = 6 as const
export const VERIFICATION_WINDOW_DAYS = 14

export const projectStatuses = ["Ordered", "Shipped", "Received", "Stored", "Ready for Delivery", "Delivered", "Installed"] as const
export const packageTypes = ["Pallet", "Box", "Crate", "Bundle", "Loose", "Mixed"] as const
export const presenceStates = ["Present", "Removed"] as const
export const conditionStates = ["Good", "Damaged", "Needs inspection"] as const
export const protectionStates = ["Indoor", "Covered", "Exposed", "Unknown"] as const
export const accessibilityStates = ["Accessible", "Blocked", "Restricted", "Unknown"] as const
export const positionPrecisions = ["Exact", "General", "Unknown"] as const
export const photoTypes = ["Material", "Label", "Condition", "Location", "Document"] as const
export const issueTypes = ["Missing", "Damaged", "Wrong project", "Wrong quantity", "Unknown shipment", "Weather exposure", "Blocked access", "Custom"] as const
export const issuePriorities = ["Low", "Normal", "High", "Urgent"] as const
export const issueStatuses = ["Open", "In Progress", "Resolved", "Dismissed"] as const
export const issueTransitionKinds = ["Created", "Assigned", "Linked", "Status changed"] as const
export const receiptStatuses = ["Draft", "Received"] as const
export const receiptIdentityStates = ["Matched", "Unresolved"] as const
export const receiptInspectionStates = ["Pending", "Passed", "Exception"] as const
export const movementKinds = ["Move", "Reversal"] as const
export const outboundStates = ["Planned", "Ready", "Departed", "Cancelled", "Reversed"] as const

export type ProjectStatus = (typeof projectStatuses)[number]
export type PackageType = (typeof packageTypes)[number]
export type PresenceState = (typeof presenceStates)[number]
export type ConditionState = (typeof conditionStates)[number]
export type ProtectionState = (typeof protectionStates)[number]
export type AccessibilityState = (typeof accessibilityStates)[number]
export type PositionPrecision = (typeof positionPrecisions)[number]
export type PhotoType = (typeof photoTypes)[number]
export type IssueType = (typeof issueTypes)[number]
export type IssuePriority = (typeof issuePriorities)[number]
export type IssueStatus = (typeof issueStatuses)[number]
export type IssueTransitionKind = (typeof issueTransitionKinds)[number]

export type Site = { id: string; slug: string; name: string; active: boolean }
export type StorageLocation = { id: string; siteId: string; slug: string; name: string; type: "Conex" | "Outdoor" | "Office" | "Receiving"; zone: string; parentLocationId: string | null; notes: string }
export type StoragePosition = { precision: PositionPrecision; row: "Front" | "Middle" | "Back" | null; column: "Left" | "Center" | "Right" | null; note: string }
export type ProjectAlias = { id: string; projectId: string; type: "Alias" | "Field label"; value: string }
export type InventoryProject = { id: string; siteId: string; slug: string; name: string; jobNumber: string; purchaseOrders: string[]; status: ProjectStatus; notes: string[]; createdAt: string; updatedAt: string }
export type MaterialGroup = { id: string; projectId: string; name: string; description: string }
export type MaterialLot = {
  id: string
  projectId: string
  groupId: string
  siteId: string
  locationId: string | null
  position: StoragePosition
  packageType: PackageType
  quantity: number | null
  presence: PresenceState
  condition: ConditionState
  protection: ProtectionState
  accessibility: AccessibilityState
  handlingRequirements: string[]
  parentLotId: string | null
  rootLotId: string
  createdAt: string
  updatedAt: string
  version: number
  migrationNote?: string
}
export type PhotoRecord = { id: string; siteId: string; projectId: string | null; lotId: string | null; receiptId: string | null; movementId: string | null; outboundBatchId: string | null; issueId: string | null; locationId: string | null; type: PhotoType; caption: string; fileName: string; contentType: string; blobKey: string; takenAt: string; uploadedAt: string; operatorName: string }
export type VerificationRecord = { id: string; lotId: string; verifiedAt: string; operatorName: string; locationId: string | null; position: StoragePosition; note: string; photoIds: string[] }
export type ActivityEvent = { id: string; siteId: string; projectId: string | null; entityType: "Project" | "Lot" | "Photo" | "Issue" | "Receipt" | "Movement" | "Outbound"; entityId: string; type: "Seeded" | "Material added" | "Verified" | "Location updated" | "Photo added" | "Issue recorded" | "Issue assigned" | "Issue commented" | "Issue status changed" | "Receipt draft saved" | "Received" | "Material moved" | "Movement reversed" | "Outbound planned" | "Outbound ready" | "Outbound departed" | "Outbound cancelled" | "Outbound reversed"; description: string; occurredAt: string; operatorName: string }
export type Issue = {
  id: string
  siteId: string
  projectId: string | null
  lotId: string | null
  receiptId: string | null
  locationId: string | null
  movementId: string | null
  outboundBatchId: string | null
  type: IssueType
  priority: IssuePriority
  status: IssueStatus
  title: string
  description: string
  blocking: boolean
  assigneeName: string | null
  photoIds: string[]
  resolutionNote: string | null
  idempotencyKey: string
  createdAt: string
  updatedAt: string
  operatorName: string
}
export type IssueComment = { id: string; issueId: string; body: string; photoIds: string[]; createdAt: string; operatorName: string; userId: string | null }
export type IssueTransition = { id: string; issueId: string; kind: IssueTransitionKind; fromStatus: IssueStatus | null; toStatus: IssueStatus; note: string; occurredAt: string; operatorName: string; userId: string | null }
export type ReceiptLine = { id: string; receiptId: string; materialName: string; description: string; packageType: PackageType; quantity: number | null; condition: ConditionState; protection: ProtectionState; accessibility: AccessibilityState; handlingRequirements: string[]; targetLocationId: string | null; photoIds: string[] }
export type Receipt = { id: string; siteId: string; receiptNumber: string; projectId: string | null; identityState: (typeof receiptIdentityStates)[number]; inspectionState: (typeof receiptInspectionStates)[number]; status: (typeof receiptStatuses)[number]; handwrittenProjectText: string; physicalLabelApplied: boolean; labelPhotoId: string | null; documentPhotoIds: string[]; lineIds: string[]; stagingLocationId: string | null; notes: string; createdAt: string; updatedAt: string; completedAt: string | null; operatorName: string }
export type MaterialMovement = { id: string; siteId: string; kind: (typeof movementKinds)[number]; reason: string; note: string; operatorName: string; occurredAt: string; photoId: string | null; clientMutationId: string; reversalOfMovementId: string | null }
export type MovementLine = { id: string; movementId: string; sourceLotId: string; resultingLotId: string; sourceLocationId: string | null; sourcePosition: StoragePosition; destinationLocationId: string | null; destinationPosition: StoragePosition; quantity: number | null; resultingLotVersion: number }
export type OutboundBatch = { id: string; siteId: string; projectId: string; state: (typeof outboundStates)[number]; operatorName: string; carrierReference: string; driverReference: string; note: string; plannedAt: string; readyAt: string | null; departedAt: string | null; cancelledAt: string | null; reversedAt: string | null; photoIds: string[]; clientMutationId: string; processedMutationIds: string[]; reversalOfBatchId: string | null }
export type OutboundLine = { id: string; batchId: string; sourceLotId: string; resultingLotId: string | null; quantity: number | null; sourceLotVersion: number; sourceLocationId: string | null; sourcePosition: StoragePosition; materialName: string; packageType: PackageType; handlingRequirements: string[]; resultingLotVersion: number | null }

export type InventorySnapshot = {
  schemaVersion: typeof INVENTORY_SCHEMA_VERSION
  revision: number
  sites: Site[]
  locations: StorageLocation[]
  projects: InventoryProject[]
  aliases: ProjectAlias[]
  groups: MaterialGroup[]
  lots: MaterialLot[]
  photos: PhotoRecord[]
  verifications: VerificationRecord[]
  activities: ActivityEvent[]
  issues: Issue[]
  issueComments: IssueComment[]
  issueTransitions: IssueTransition[]
  receipts: Receipt[]
  receiptLines: ReceiptLine[]
  movements: MaterialMovement[]
  movementLines: MovementLine[]
  outboundBatches: OutboundBatch[]
  outboundLines: OutboundLine[]
}

const positionSchema = z.object({
  precision: z.enum(positionPrecisions),
  row: z.enum(["Front", "Middle", "Back"]).nullable(),
  column: z.enum(["Left", "Center", "Right"]).nullable(),
  note: z.string(),
})

const id = z.string().uuid()
const timestamp = z.string().datetime({ offset: true })

export const inventorySnapshotSchema: z.ZodType<InventorySnapshot> = z.object({
  schemaVersion: z.literal(INVENTORY_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  sites: z.array(z.object({ id, slug: z.string(), name: z.string(), active: z.boolean() })),
  locations: z.array(z.object({ id, siteId: id, slug: z.string(), name: z.string(), type: z.enum(["Conex", "Outdoor", "Office", "Receiving"]), zone: z.string(), parentLocationId: id.nullable(), notes: z.string() })),
  projects: z.array(z.object({ id, siteId: id, slug: z.string(), name: z.string(), jobNumber: z.string(), purchaseOrders: z.array(z.string()), status: z.enum(projectStatuses), notes: z.array(z.string()), createdAt: timestamp, updatedAt: timestamp })),
  aliases: z.array(z.object({ id, projectId: id, type: z.enum(["Alias", "Field label"]), value: z.string() })),
  groups: z.array(z.object({ id, projectId: id, name: z.string(), description: z.string() })),
  lots: z.array(z.object({ id, projectId: id, groupId: id, siteId: id, locationId: id.nullable(), position: positionSchema, packageType: z.enum(packageTypes), quantity: z.number().int().nonnegative().nullable(), presence: z.enum(presenceStates), condition: z.enum(conditionStates), protection: z.enum(protectionStates), accessibility: z.enum(accessibilityStates), handlingRequirements: z.array(z.string()), parentLotId: id.nullable(), rootLotId: id, createdAt: timestamp, updatedAt: timestamp, version: z.number().int().positive(), migrationNote: z.string().optional() })),
  photos: z.array(z.object({ id, siteId: id, projectId: id.nullable(), lotId: id.nullable(), receiptId: id.nullable(), movementId: id.nullable(), outboundBatchId: id.nullable(), issueId: id.nullable(), locationId: id.nullable(), type: z.enum(photoTypes), caption: z.string(), fileName: z.string(), contentType: z.string(), blobKey: z.string(), takenAt: timestamp, uploadedAt: timestamp, operatorName: z.string() })),
  verifications: z.array(z.object({ id, lotId: id, verifiedAt: timestamp, operatorName: z.string(), locationId: id.nullable(), position: positionSchema, note: z.string(), photoIds: z.array(id) })),
  activities: z.array(z.object({ id, siteId: id, projectId: id.nullable(), entityType: z.enum(["Project", "Lot", "Photo", "Issue", "Receipt", "Movement", "Outbound"]), entityId: id, type: z.enum(["Seeded", "Material added", "Verified", "Location updated", "Photo added", "Issue recorded", "Issue assigned", "Issue commented", "Issue status changed", "Receipt draft saved", "Received", "Material moved", "Movement reversed", "Outbound planned", "Outbound ready", "Outbound departed", "Outbound cancelled", "Outbound reversed"]), description: z.string(), occurredAt: timestamp, operatorName: z.string() })),
  issues: z.array(z.object({ id, siteId: id, projectId: id.nullable(), lotId: id.nullable(), receiptId: id.nullable(), locationId: id.nullable(), movementId: id.nullable(), outboundBatchId: id.nullable(), type: z.enum(issueTypes), priority: z.enum(issuePriorities), status: z.enum(issueStatuses), title: z.string(), description: z.string(), blocking: z.boolean(), assigneeName: z.string().nullable(), photoIds: z.array(id), resolutionNote: z.string().nullable(), idempotencyKey: z.string().min(1), createdAt: timestamp, updatedAt: timestamp, operatorName: z.string() })),
  issueComments: z.array(z.object({ id, issueId: id, body: z.string(), photoIds: z.array(id), createdAt: timestamp, operatorName: z.string(), userId: id.nullable() })),
  issueTransitions: z.array(z.object({ id, issueId: id, kind: z.enum(issueTransitionKinds), fromStatus: z.enum(issueStatuses).nullable(), toStatus: z.enum(issueStatuses), note: z.string(), occurredAt: timestamp, operatorName: z.string(), userId: id.nullable() })),
  receipts: z.array(z.object({ id, siteId: id, receiptNumber: z.string(), projectId: id.nullable(), identityState: z.enum(receiptIdentityStates), inspectionState: z.enum(receiptInspectionStates), status: z.enum(receiptStatuses), handwrittenProjectText: z.string(), physicalLabelApplied: z.boolean(), labelPhotoId: id.nullable(), documentPhotoIds: z.array(id), lineIds: z.array(id), stagingLocationId: id.nullable(), notes: z.string(), createdAt: timestamp, updatedAt: timestamp, completedAt: timestamp.nullable(), operatorName: z.string() })),
  receiptLines: z.array(z.object({ id, receiptId: id, materialName: z.string(), description: z.string(), packageType: z.enum(packageTypes), quantity: z.number().int().nonnegative().nullable(), condition: z.enum(conditionStates), protection: z.enum(protectionStates), accessibility: z.enum(accessibilityStates), handlingRequirements: z.array(z.string()), targetLocationId: id.nullable(), photoIds: z.array(id) })),
  movements: z.array(z.object({ id, siteId: id, kind: z.enum(movementKinds), reason: z.string(), note: z.string(), operatorName: z.string(), occurredAt: timestamp, photoId: id.nullable(), clientMutationId: z.string().min(1), reversalOfMovementId: id.nullable() })),
  movementLines: z.array(z.object({ id, movementId: id, sourceLotId: id, resultingLotId: id, sourceLocationId: id.nullable(), sourcePosition: positionSchema, destinationLocationId: id.nullable(), destinationPosition: positionSchema, quantity: z.number().int().positive().nullable(), resultingLotVersion: z.number().int().positive() })),
  outboundBatches: z.array(z.object({ id, siteId: id, projectId: id, state: z.enum(outboundStates), operatorName: z.string(), carrierReference: z.string(), driverReference: z.string(), note: z.string(), plannedAt: timestamp, readyAt: timestamp.nullable(), departedAt: timestamp.nullable(), cancelledAt: timestamp.nullable(), reversedAt: timestamp.nullable(), photoIds: z.array(id), clientMutationId: z.string().min(1), processedMutationIds: z.array(z.string().min(1)), reversalOfBatchId: id.nullable() })),
  outboundLines: z.array(z.object({ id, batchId: id, sourceLotId: id, resultingLotId: id.nullable(), quantity: z.number().int().positive().nullable(), sourceLotVersion: z.number().int().positive(), sourceLocationId: id.nullable(), sourcePosition: positionSchema, materialName: z.string(), packageType: z.enum(packageTypes), handlingRequirements: z.array(z.string()), resultingLotVersion: z.number().int().positive().nullable() })),
})

export function migrateInventorySnapshot(value: unknown): InventorySnapshot {
  if (!value || typeof value !== "object" || !("schemaVersion" in value)) return inventorySnapshotSchema.parse(value)
  const legacy = structuredClone(value) as Record<string, unknown>
  const version = Number(legacy.schemaVersion)
  if (version === INVENTORY_SCHEMA_VERSION) return inventorySnapshotSchema.parse(legacy)
  if (![1, 2, 3, 4, 5].includes(version)) return inventorySnapshotSchema.parse(legacy)

  if (version === 1) {
    legacy.lots = (legacy.lots as Array<Record<string, unknown>>).map((lot) => ({ ...lot, rootLotId: lot.id }))
    legacy.photos = (legacy.photos as Array<Record<string, unknown>>).map((photo) => ({ ...photo, receiptId: null, movementId: null, outboundBatchId: null }))
    legacy.receipts = []
    legacy.receiptLines = []
    legacy.movements = []
    legacy.movementLines = []
    legacy.outboundBatches = []
    legacy.outboundLines = []
  }
  if (version === 2) {
    legacy.lots = (legacy.lots as Array<Record<string, unknown>>).map((lot) => ({ ...lot, rootLotId: lot.parentLotId ?? lot.id }))
    legacy.photos = (legacy.photos as Array<Record<string, unknown>>).map((photo) => ({ ...photo, movementId: null, outboundBatchId: null }))
    legacy.movements = []
    legacy.movementLines = []
    legacy.outboundBatches = []
    legacy.outboundLines = []
  }
  if (version === 3) {
    legacy.photos = (legacy.photos as Array<Record<string, unknown>>).map((photo) => ({ ...photo, outboundBatchId: null }))
    legacy.outboundBatches = []
    legacy.outboundLines = []
  }

  const legacyPhotos: Array<Record<string, unknown>> = (legacy.photos as Array<Record<string, unknown>>).map((photo) => ({ ...photo, issueId: photo.issueId ?? null }))
  const legacyIssues = legacy.issues as Array<Record<string, unknown>>
  const issues: Array<Record<string, unknown>> = legacyIssues.map((issue) => {
    const existingPhotoIds = Array.isArray(issue.photoIds) ? issue.photoIds as string[] : []
    const receivingPhotoIds = issue.type === "Damaged"
      ? legacyPhotos.filter((photo) => photo["lotId"] === issue["lotId"] && photo["receiptId"] === issue["receiptId"] && String(photo["contentType"]).startsWith("image/")).map((photo) => String(photo["id"]))
      : []
    return {
      ...issue,
      locationId: issue.locationId ?? null,
      movementId: issue.movementId ?? null,
      outboundBatchId: issue.outboundBatchId ?? null,
      photoIds: [...new Set([...existingPhotoIds, ...receivingPhotoIds])],
      resolutionNote: issue.resolutionNote ?? null,
      idempotencyKey: issue.idempotencyKey ?? `legacy:${issue.id}`,
    }
  })
  for (const photo of legacyPhotos) {
    const linkedIssue = issues.find((issue) => (issue["photoIds"] as string[]).includes(String(photo["id"])))
    if (linkedIssue && !photo["issueId"]) photo["issueId"] = linkedIssue["id"]
  }
  legacy.photos = legacyPhotos
  legacy.issues = issues
  legacy.issueComments = Array.isArray(legacy.issueComments) ? legacy.issueComments : []
  legacy.issueTransitions = Array.isArray(legacy.issueTransitions) ? legacy.issueTransitions : issues.map((issue) => ({ id: issue["id"], issueId: issue["id"], kind: "Created", fromStatus: null, toStatus: issue["status"], note: "Migrated foundation Issue.", occurredAt: issue["createdAt"], operatorName: issue["operatorName"], userId: null }))

  const locations = legacy.locations as Array<Record<string, unknown>>
  const projects = legacy.projects as Array<Record<string, unknown>>
  const groups = legacy.groups as Array<Record<string, unknown>>
  const lots = legacy.lots as Array<Record<string, unknown>>
  const activities = legacy.activities as Array<Record<string, unknown>>
  const conex8Id = "00000000-0000-4000-8000-000000000110"
  if (!locations.some((location) => location["slug"] === "conex-8")) {
    locations.push({
      id: conex8Id,
      siteId: "00000000-0000-4000-8000-000000000001",
      slug: "conex-8",
      name: "Conex 8",
      type: "Conex",
      zone: "Lavon Yard",
      parentLocationId: null,
      notes: "Keep project labels visible from the center aisle.",
    })
  }

  const fwProject = projects.find((project) => project["slug"] === "fw-maudrie-walton")
  const placeholderGroup = fwProject ? groups.find((group) => group["projectId"] === fwProject["id"] && group["name"] === "Architectural Specialties") : undefined
  const placeholderLot = placeholderGroup ? lots.find((lot) => lot["groupId"] === placeholderGroup["id"]) : undefined
  if (fwProject && placeholderGroup && placeholderLot && placeholderLot["version"] === 1) {
    placeholderGroup["name"] = "Marker Boards"
    placeholderGroup["description"] = "12-foot Marker Boards"
    placeholderLot["locationId"] = conex8Id
    placeholderLot["position"] = unknownPosition()
    placeholderLot["packageType"] = "Loose"
    placeholderLot["quantity"] = 8
    placeholderLot["updatedAt"] = "2026-08-17T14:00:00.000Z"
    placeholderLot["version"] = 2
    placeholderLot["migrationNote"] = "Confirmed inventory update: quantity 8, 12-foot Marker Boards, stored in Conex 8; exact position remains unverified."
    fwProject["updatedAt"] = "2026-08-17T14:00:00.000Z"

    const accessoryGroup = groups.find((group) => group["projectId"] === fwProject["id"] && group["name"] === "Project Accessories")
    const accessoryLot = accessoryGroup ? lots.find((lot) => lot["groupId"] === accessoryGroup["id"]) : undefined
    const accessoryLotId = String(accessoryLot?.["id"] ?? "")
    const accessoryIsReferenced = accessoryLotId !== "" && [
      ...(legacy.photos as Array<Record<string, unknown>>).map((photo) => photo["lotId"]),
      ...(legacy.verifications as Array<Record<string, unknown>>).map((verification) => verification["lotId"]),
      ...(legacy.issues as Array<Record<string, unknown>>).map((issue) => issue["lotId"]),
      ...(legacy.movementLines as Array<Record<string, unknown>>).flatMap((line) => [line["sourceLotId"], line["resultingLotId"]]),
      ...(legacy.outboundLines as Array<Record<string, unknown>>).flatMap((line) => [line["sourceLotId"], line["resultingLotId"]]),
    ].some((id) => id === accessoryLotId)
    if (accessoryGroup && accessoryLot && accessoryLot["version"] === 1 && !accessoryIsReferenced) {
      legacy.lots = lots.filter((lot) => lot["id"] !== accessoryLot["id"])
      legacy.groups = groups.filter((group) => group["id"] !== accessoryGroup["id"])
    }

    if (!activities.some((activity) => activity["id"] === "00000000-0000-4000-8000-000000039000")) {
      activities.push({
        id: "00000000-0000-4000-8000-000000039000",
        siteId: fwProject["siteId"],
        projectId: fwProject["id"],
        entityType: "Lot",
        entityId: placeholderLot["id"],
        type: "Material added",
        description: "Inventory confirmed: 8 12-foot Marker Boards stored in Conex 8.",
        occurredAt: "2026-08-17T14:00:00.000Z",
        operatorName: "Tyler Vea",
      })
    }
  }

  legacy.schemaVersion = INVENTORY_SCHEMA_VERSION
  return inventorySnapshotSchema.parse(legacy)
}

export function unknownPosition(): StoragePosition {
  return { precision: "Unknown", row: null, column: null, note: "" }
}
