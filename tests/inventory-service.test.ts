import { describe, expect, it } from "vitest"

import { inventorySeed } from "@/features/inventory/data/seed-data"
import { issueTypes, migrateInventorySnapshot } from "@/features/inventory/domain/inventory"
import { issueEvidenceState, lotVerificationState, projectPackageTotal, projectReadiness, searchInventory } from "@/features/inventory/domain/selectors"
import { MemoryInventoryPersistence } from "@/features/inventory/repositories/memory-inventory-persistence"
import { createInventoryService } from "@/features/inventory/services/inventory-service"

describe("yard domain foundation", () => {
  it("upgrades Phase 2 snapshots with lineage and empty movement history", () => {
    const legacy = structuredClone(inventorySeed) as unknown as Record<string, unknown>
    legacy.schemaVersion = 2
    delete legacy.movements
    delete legacy.movementLines
    legacy.lots = (legacy.lots as Array<Record<string, unknown>>).map((lot) => { const copy = { ...lot }; delete copy.rootLotId; return copy })
    legacy.photos = (legacy.photos as Array<Record<string, unknown>>).map((photo) => { const copy = { ...photo }; delete copy.movementId; return copy })
    const migrated = migrateInventorySnapshot(legacy)
    expect(migrated.schemaVersion).toBe(5)
    expect(migrated.lots.every((lot) => lot.rootLotId === lot.id)).toBe(true)
    expect(migrated.movements).toEqual([])
  })

  it("migrates every legacy group into one normalized material lot", () => {
    expect(inventorySeed.lots).toHaveLength(inventorySeed.groups.length)
    expect(inventorySeed.lots.every((lot) => lot.packageType === "Mixed")).toBe(true)
    expect(inventorySeed.lots.every((lot) => lot.position.precision === "Unknown")).toBe(true)
    expect(new Set(inventorySeed.locations.filter((location) => location.type === "Conex").map((location) => location.name))).toEqual(new Set(["Conex 1", "Conex 2", "Conex 3", "Conex 4", "Conex 5", "Conex 6", "Conex 7"]))
  })

  it("adds and verifies a lot while deriving totals from lots", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    const before = projectPackageTotal(inventorySeed, project.id).known
    const added = await service.addMaterial({
      projectId: project.id, operatorName: "Yard Operator", materialName: "Field verified accessories", description: "Recorded during test acceptance", packageType: "Box", quantity: 3,
      condition: "Good", protection: "Indoor", accessibility: "Accessible", handlingRequirements: ["Keep dry"], locationId: inventorySeed.locations[0].id,
      precision: "Exact", row: "Front", column: "Left", positionNote: "Lower stack",
    })
    const lot = added.lots.at(-1)!
    expect(projectPackageTotal(added, project.id).known).toBe(before + 3)
    expect(lotVerificationState(added, lot, new Date("2026-08-06T18:00:00Z")).label).toBe("Needs verification")

    const verified = await service.verifyLot({ lotId: lot.id, operatorName: "Yard Operator", locationId: inventorySeed.locations[1].id, precision: "General", row: null, column: null, positionNote: "East half", note: "Count confirmed" })
    const verifiedLot = verified.lots.find((item) => item.id === lot.id)!
    expect(verifiedLot.locationId).toBe(inventorySeed.locations[1].id)
    expect(verifiedLot.version).toBe(2)
    expect(verified.activities.at(-1)?.operatorName).toBe("Yard Operator")
  })

  it("explains alias and handwritten field-label search matches", () => {
    const project = inventorySeed.projects[0]
    const snapshot = { ...inventorySeed, aliases: [{ id: "00000000-0000-4000-8000-000000090001", projectId: project.id, type: "Field label" as const, value: "MW school wing" }] }
    expect(searchInventory(snapshot, "school wing")).toEqual([{ project, explanation: "Matched field label: MW school wing" }])
  })

  it("rejects mutations without the required operator name", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    await expect(service.recordIssue({ siteId: inventorySeed.sites[0].id, projectId: null, lotId: null, receiptId: null, locationId: null, movementId: null, outboundBatchId: null, type: "Custom", priority: "Normal", title: "Test", description: "", blocking: false, operatorName: "", clientMutationId: "issue-missing-operator" })).rejects.toThrow("Operator name is required")
  })
})

describe("project readiness and outbound", () => {
  async function outboundFixture(quantity = 10) {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    const added = await service.addMaterial({
      projectId: project.id,
      operatorName: "Yard Operator",
      materialName: "Outbound fixture",
      description: "Phase 4 field acceptance",
      packageType: "Pallet",
      quantity,
      condition: "Good",
      protection: "Covered",
      accessibility: "Accessible",
      handlingRequirements: ["Keep dry"],
      locationId: inventorySeed.locations[0].id,
      precision: "General",
      positionNote: "Outbound source",
    })
    const lot = added.lots.at(-1)!
    const verified = await service.verifyLot({
      lotId: lot.id,
      operatorName: "Yard Operator",
      locationId: lot.locationId,
      precision: lot.position.precision,
      positionNote: lot.position.note,
      note: "Outbound count confirmed",
    })
    return { service, project, lot: verified.lots.find((item) => item.id === lot.id)! }
  }

  it("upgrades Phase 3 snapshots with empty outbound history", () => {
    const legacy = structuredClone(inventorySeed) as unknown as Record<string, unknown>
    legacy.schemaVersion = 3
    delete legacy.outboundBatches
    delete legacy.outboundLines
    legacy.photos = (legacy.photos as Array<Record<string, unknown>>).map((photo) => {
      const copy = { ...photo }
      delete copy.outboundBatchId
      return copy
    })
    const migrated = migrateInventorySnapshot(legacy)
    expect(migrated.schemaVersion).toBe(5)
    expect(migrated.outboundBatches).toEqual([])
    expect(migrated.outboundLines).toEqual([])
  })

  it("derives readiness separately from project status and blocking issues", async () => {
    const { service, project, lot } = await outboundFixture()
    const ready = projectReadiness(await service.load(), project.id)
    expect(ready.status).toBe("Needs verification")
    expect(ready.verificationDue.some((item) => item.id === lot.id)).toBe(false)

    const blocked = await service.recordIssue({
      siteId: project.siteId,
      projectId: project.id,
      lotId: lot.id,
      receiptId: null,
      locationId: null,
      movementId: null,
      outboundBatchId: null,
      type: "Blocked access",
      priority: "High",
      title: "Pickup access blocked",
      description: "Field fixture",
      blocking: true,
      operatorName: "Yard Operator",
      clientMutationId: "readiness-blocked-access",
    })
    expect(projectReadiness(blocked, project.id).status).toBe("Blocked")
    expect(blocked.projects.find((item) => item.id === project.id)?.status).toBe(project.status)
  })

  it("plans, readies, and partially departs material without requiring a photo", async () => {
    const { service, project, lot } = await outboundFixture(10)
    const planned = await service.createOutboundBatch({
      projectId: project.id,
      operatorName: "Outbound Planner",
      clientMutationId: "outbound-plan-partial",
      lines: [{ lotId: lot.id, quantity: 4, expectedVersion: lot.version }],
    })
    const batch = planned.outboundBatches.at(-1)!
    expect(batch.state).toBe("Planned")
    const ready = await service.markOutboundReady({ batchId: batch.id, operatorName: "Yard Lead", clientMutationId: "outbound-ready-partial" })
    expect(ready.outboundBatches.find((item) => item.id === batch.id)?.state).toBe("Ready")

    const departed = await service.departOutboundBatch({ batchId: batch.id, operatorName: "Yard Lead", clientMutationId: "outbound-depart-partial", carrierReference: "", driverReference: "", note: "Count confirmed", file: null })
    const source = departed.lots.find((item) => item.id === lot.id)!
    const child = departed.lots.find((item) => item.parentLotId === lot.id && item.presence === "Removed")!
    expect(source).toMatchObject({ quantity: 6, presence: "Present" })
    expect(child).toMatchObject({ quantity: 4, rootLotId: lot.rootLotId, presence: "Removed" })
    expect(departed.outboundBatches.find((item) => item.id === batch.id)).toMatchObject({ state: "Departed", photoIds: [] })
    expect(departed.activities.at(-1)).toMatchObject({ type: "Outbound departed", operatorName: "Yard Lead" })
  })

  it("locks reservations, releases cancellations, and reverses departure with compensating history", async () => {
    const { service, project, lot } = await outboundFixture(5)
    const planned = await service.createOutboundBatch({ projectId: project.id, operatorName: "Outbound Planner", clientMutationId: "outbound-lock-plan", lines: [{ lotId: lot.id, quantity: 5, expectedVersion: lot.version }] })
    const batch = planned.outboundBatches.at(-1)!
    await expect(service.createOutboundBatch({ projectId: project.id, operatorName: "Outbound Planner", clientMutationId: "outbound-duplicate-plan", lines: [{ lotId: lot.id, quantity: 5, expectedVersion: lot.version }] })).rejects.toThrow("already reserved")
    await expect(service.moveMaterial({ operatorName: "Yard Operator", reason: "Attempt reserved move", note: "", clientMutationId: "reserved-move", locationId: inventorySeed.locations[1].id, precision: "General", positionNote: "Destination", lines: [{ lotId: lot.id, quantity: 5, expectedVersion: lot.version }] })).rejects.toThrow("reserved for outbound")

    await service.cancelOutboundBatch({ batchId: batch.id, operatorName: "Yard Lead", clientMutationId: "outbound-cancel", note: "Pickup changed" })
    const replanned = await service.createOutboundBatch({ projectId: project.id, operatorName: "Outbound Planner", clientMutationId: "outbound-replan", lines: [{ lotId: lot.id, quantity: 5, expectedVersion: lot.version }] })
    const replacement = replanned.outboundBatches.at(-1)!
    await service.markOutboundReady({ batchId: replacement.id, operatorName: "Yard Lead", clientMutationId: "outbound-replan-ready" })
    const departed = await service.departOutboundBatch({ batchId: replacement.id, operatorName: "Yard Lead", clientMutationId: "outbound-replan-depart", carrierReference: "Carrier reference", driverReference: "Driver reference", note: "", file: null })
    expect(departed.lots.find((item) => item.id === lot.id)?.presence).toBe("Removed")

    const reversed = await service.reverseOutboundBatch({ batchId: replacement.id, operatorName: "Yard Manager", clientMutationId: "outbound-reversal", note: "Departure entered incorrectly" })
    expect(reversed.lots.find((item) => item.id === lot.id)?.presence).toBe("Present")
    expect(reversed.outboundBatches.at(-1)).toMatchObject({ state: "Reversed", reversalOfBatchId: replacement.id })
    expect(reversed.outboundBatches.find((item) => item.id === replacement.id)?.state).toBe("Departed")
    await expect(service.reverseOutboundBatch({ batchId: replacement.id, operatorName: "Yard Manager", clientMutationId: "outbound-reversal-repeat", note: "Repeat" })).rejects.toThrow("already been reversed")
  })
})

describe("receiving operations", () => {
  const line = { materialName: "Receiving test material", description: "Field acceptance fixture", packageType: "Pallet" as const, quantity: 2, condition: "Good" as const, protection: "Covered" as const, accessibility: "Accessible" as const, handlingRequirements: ["Keep dry"], targetLocationId: inventorySeed.locations[0].id, file: new File(["material evidence"], "material.jpg", { type: "image/jpeg" }), photoType: "Material" as const }

  it("recovers a known-project draft and atomically creates lots on completion", async () => {
    const persistence = new MemoryInventoryPersistence()
    const service = createInventoryService(persistence, inventorySeed)
    const project = inventorySeed.projects[0]
    const draft = await service.saveReceiptDraft({ siteId: project.siteId, receiptNumber: "RCV-100", projectId: project.id, inspectionState: "Passed", handwrittenProjectText: "FW Walton", physicalLabelApplied: true, stagingLocationId: inventorySeed.locations[0].id, notes: "", operatorName: "Receiving Operator", lines: [line, { ...line, materialName: "Accessory cartons", packageType: "Box", quantity: null }] })
    const receipt = draft.receipts.at(-1)!
    expect((await service.load()).receipts.find((item) => item.id === receipt.id)?.status).toBe("Draft")
    const lotCount = draft.lots.length

    const received = await service.completeReceipt(receipt.id, "Receiving Operator")
    expect(received.lots).toHaveLength(lotCount + 2)
    expect(received.lots.at(-1)?.quantity).toBeNull()
    expect(received.verifications.filter((record) => received.lots.slice(-2).some((lot) => lot.id === record.lotId))).toHaveLength(2)
    expect(received.receipts.find((item) => item.id === receipt.id)?.status).toBe("Received")
  })

  it("preserves an unknown shipment and creates a linked issue without material lots", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const draft = await service.saveReceiptDraft({ siteId: inventorySeed.sites[0].id, receiptNumber: "RCV-UNKNOWN", projectId: null, inspectionState: "Exception", handwrittenProjectText: "Handwritten unknown job", physicalLabelApplied: false, stagingLocationId: inventorySeed.locations[1].id, notes: "Identity unresolved", operatorName: "Receiving Operator", lines: [line] })
    const receipt = draft.receipts.at(-1)!
    const received = await service.completeReceipt(receipt.id, "Receiving Operator")
    expect(received.lots).toHaveLength(inventorySeed.lots.length)
    expect(received.issues.find((issue) => issue.receiptId === receipt.id)).toMatchObject({ type: "Unknown shipment", status: "Open" })
    expect(received.receipts.find((item) => item.id === receipt.id)).toMatchObject({ identityState: "Unresolved", status: "Received" })
  })

  it("does not create partial lots when receipt validation fails", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    await expect(service.saveReceiptDraft({ siteId: inventorySeed.sites[0].id, receiptNumber: "RCV-BAD", projectId: inventorySeed.projects[0].id, inspectionState: "Pending", handwrittenProjectText: "", physicalLabelApplied: false, stagingLocationId: null, notes: "", operatorName: "Receiving Operator", lines: [{ ...line, quantity: -1 }] })).rejects.toThrow("whole number or unknown")
    expect((await service.load()).receipts).toHaveLength(0)
    expect((await service.load()).lots).toHaveLength(inventorySeed.lots.length)
  })

  it("allows photo-free drafts but requires and preserves a material photo before completion", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    const withoutPhoto = { ...line, file: null }
    const draft = await service.saveReceiptDraft({ siteId: project.siteId, receiptNumber: "RCV-PHOTO-RULE", projectId: project.id, inspectionState: "Passed", handwrittenProjectText: project.name, physicalLabelApplied: true, stagingLocationId: inventorySeed.locations[0].id, notes: "", operatorName: "Receiving Operator", lines: [withoutPhoto] })
    const receipt = draft.receipts.at(-1)!
    await expect(service.completeReceipt(receipt.id, "Receiving Operator")).rejects.toThrow("Material photo is required for receipt line 1")
    expect((await service.load()).lots).toHaveLength(inventorySeed.lots.length)

    const photographed = await service.saveReceiptDraft({ receiptId: receipt.id, siteId: project.siteId, receiptNumber: receipt.receiptNumber, projectId: project.id, inspectionState: "Passed", handwrittenProjectText: project.name, physicalLabelApplied: true, stagingLocationId: inventorySeed.locations[0].id, notes: "", operatorName: "Receiving Operator", lines: [{ ...line, id: receipt.lineIds[0] }] })
    const savedLine = photographed.receiptLines.find((item) => item.id === receipt.lineIds[0])!
    expect(savedLine.photoIds).toHaveLength(1)

    await service.saveReceiptDraft({ receiptId: receipt.id, siteId: project.siteId, receiptNumber: receipt.receiptNumber, projectId: project.id, inspectionState: "Passed", handwrittenProjectText: project.name, physicalLabelApplied: true, stagingLocationId: inventorySeed.locations[0].id, notes: "", operatorName: "Receiving Operator", lines: [{ ...withoutPhoto, id: savedLine.id }] })
    const received = await service.completeReceipt(receipt.id, "Receiving Operator")
    expect(received.receipts.find((item) => item.id === receipt.id)?.status).toBe("Received")
    expect(received.receiptLines.find((item) => item.id === savedLine.id)?.photoIds).toEqual(savedLine.photoIds)
  })
})

describe("material movement", () => {
  async function movementFixture(quantity = 10) {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    const snapshot = await service.addMaterial({
      projectId: project.id, operatorName: "Yard Operator", materialName: "Movement fixture", description: "Field movement acceptance", packageType: "Pallet", quantity,
      condition: "Good", protection: "Covered", accessibility: "Accessible", handlingRequirements: ["Keep dry"], locationId: inventorySeed.locations[0].id,
      precision: "Exact", row: "Front", column: "Left", positionNote: "Source stack",
    })
    return { service, project, lot: snapshot.lots.at(-1)! }
  }

  it("moves a complete lot and records immutable source and destination history", async () => {
    const { service, lot } = await movementFixture()
    const destination = inventorySeed.locations[1]
    const moved = await service.moveMaterial({ operatorName: "Forklift Operator", reason: "Clear receiving lane", note: "Count checked", clientMutationId: "move-full-1", locationId: destination.id, precision: "Exact", row: "Back", column: "Right", positionNote: "Upper stack", lines: [{ lotId: lot.id, quantity: 10, expectedVersion: lot.version }] })
    expect(moved.lots.find((item) => item.id === lot.id)).toMatchObject({ locationId: destination.id, quantity: 10, version: 2 })
    expect(moved.movementLines.at(-1)).toMatchObject({ sourceLotId: lot.id, resultingLotId: lot.id, sourceLocationId: inventorySeed.locations[0].id, destinationLocationId: destination.id, quantity: 10 })
    expect(moved.activities.at(-1)).toMatchObject({ type: "Material moved", operatorName: "Forklift Operator" })
  })

  it("splits a partial quantity into a traceable child without changing totals", async () => {
    const { service, project, lot } = await movementFixture()
    const before = (await service.load()).lots.filter((item) => item.projectId === project.id).reduce((total, item) => total + (item.quantity ?? 0), 0)
    const moved = await service.moveMaterial({ operatorName: "Yard Operator", reason: "Stage installation package", note: "", clientMutationId: "move-partial-1", locationId: inventorySeed.locations[2].id, precision: "General", positionNote: "East half", lines: [{ lotId: lot.id, quantity: 3, expectedVersion: lot.version }] })
    const source = moved.lots.find((item) => item.id === lot.id)!
    const child = moved.lots.find((item) => item.parentLotId === lot.id)!
    const after = moved.lots.filter((item) => item.projectId === project.id).reduce((total, item) => total + (item.quantity ?? 0), 0)
    expect(source.quantity).toBe(7)
    expect(child).toMatchObject({ quantity: 3, rootLotId: lot.id, locationId: inventorySeed.locations[2].id })
    expect(after).toBe(before)
  })

  it("moves multiple lots atomically and rejects stale or invalid lines", async () => {
    const { service, project, lot } = await movementFixture(4)
    const added = await service.addMaterial({ projectId: project.id, operatorName: "Yard Operator", materialName: "Second movement fixture", description: "", packageType: "Box", quantity: 2, condition: "Good", protection: "Indoor", accessibility: "Accessible", handlingRequirements: [], locationId: inventorySeed.locations[0].id, precision: "General", positionNote: "Nearby" })
    const second = added.lots.at(-1)!
    await expect(service.moveMaterial({ operatorName: "Yard Operator", reason: "Batch stage", note: "", clientMutationId: "move-bad-1", locationId: inventorySeed.locations[3].id, precision: "General", positionNote: "Staging", lines: [{ lotId: lot.id, quantity: 4, expectedVersion: lot.version }, { lotId: second.id, quantity: 3, expectedVersion: second.version }] })).rejects.toThrow("no greater than")
    expect((await service.load()).movements).toHaveLength(0)
    await expect(service.moveMaterial({ operatorName: "Yard Operator", reason: "Batch stage", note: "", clientMutationId: "move-stale-1", locationId: inventorySeed.locations[3].id, precision: "General", positionNote: "Staging", lines: [{ lotId: lot.id, quantity: 4, expectedVersion: 99 }] })).rejects.toThrow("changed after selection")
    const moved = await service.moveMaterial({ operatorName: "Yard Operator", reason: "Batch stage", note: "", clientMutationId: "move-batch-1", locationId: inventorySeed.locations[3].id, precision: "General", positionNote: "Staging", lines: [{ lotId: lot.id, quantity: 4, expectedVersion: lot.version }, { lotId: second.id, quantity: 2, expectedVersion: second.version }] })
    expect(moved.movementLines.filter((line) => line.movementId === moved.movements.at(-1)?.id)).toHaveLength(2)
  })

  it("reverses a movement with a new event and prevents destructive repeat reversal", async () => {
    const { service, lot } = await movementFixture(5)
    const moved = await service.moveMaterial({ operatorName: "Yard Operator", reason: "Temporary staging", note: "", clientMutationId: "move-reverse-source", locationId: inventorySeed.locations[4].id, precision: "General", positionNote: "West side", lines: [{ lotId: lot.id, quantity: 5, expectedVersion: lot.version }] })
    const original = moved.movements.at(-1)!
    const reversed = await service.reverseMovement({ movementId: original.id, operatorName: "Yard Manager", note: "Destination entered incorrectly", clientMutationId: "move-reversal-1" })
    expect(reversed.lots.find((item) => item.id === lot.id)?.locationId).toBe(inventorySeed.locations[0].id)
    expect(reversed.movements.at(-1)).toMatchObject({ kind: "Reversal", reversalOfMovementId: original.id })
    await expect(service.reverseMovement({ movementId: original.id, operatorName: "Yard Manager", note: "Repeat", clientMutationId: "move-reversal-2" })).rejects.toThrow("already been reversed")
  })
})

describe("issues and material condition", () => {
  const links = { receiptId: null, locationId: null, movementId: null, outboundBatchId: null }

  it("upgrades Phase 4 Issues to schema 5 without inventing missing damage evidence", () => {
    const legacy = structuredClone(inventorySeed) as unknown as Record<string, unknown>
    const project = inventorySeed.projects[0]
    const lot = inventorySeed.lots.find((item) => item.projectId === project.id)!
    legacy.schemaVersion = 4
    legacy.issues = [{ id: "00000000-0000-4000-8000-000000099001", siteId: project.siteId, projectId: project.id, lotId: lot.id, receiptId: null, type: "Damaged", priority: "High", status: "Open", title: "Legacy damage", description: "Evidence was not linked in the prior schema.", blocking: true, assigneeName: null, createdAt: "2026-08-01T12:00:00.000Z", updatedAt: "2026-08-01T12:00:00.000Z", operatorName: "Legacy Operator" }]
    delete legacy.issueComments
    delete legacy.issueTransitions
    legacy.photos = (legacy.photos as Array<Record<string, unknown>>).map((photo) => { const copy = { ...photo }; delete copy.issueId; return copy })

    const migrated = migrateInventorySnapshot(legacy)
    const issue = migrated.issues[0]
    expect(migrated.schemaVersion).toBe(5)
    expect(issue).toMatchObject({ locationId: null, movementId: null, outboundBatchId: null, photoIds: [], resolutionNote: null })
    expect(issueEvidenceState(migrated, issue)).toBe("Needs evidence")
    expect(migrated.issueTransitions).toEqual([expect.objectContaining({ issueId: issue.id, kind: "Created", toStatus: "Open", operatorName: "Legacy Operator" })])
  })

  it("records every supported Issue type while enforcing evidence only for damage", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    for (const [index, type] of issueTypes.entries()) {
      await service.recordIssue({ siteId: project.siteId, projectId: project.id, lotId: null, ...links, type, priority: "Normal", title: `Issue type ${type}`, description: "Phase 5 type acceptance.", blocking: false, operatorName: "Yard Operator", clientMutationId: `issue-type-${index}`, file: type === "Damaged" ? new File(["damage"], "damage.jpg", { type: "image/jpeg" }) : null })
    }
    const snapshot = await service.load()
    expect(snapshot.issues.filter((issue) => issue.idempotencyKey.startsWith("issue-type-")).map((issue) => issue.type)).toEqual(issueTypes)
  })

  it("requires image evidence for damaged Issues while other Issue types remain photo-optional and idempotent", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    const base = { siteId: project.siteId, projectId: project.id, lotId: inventorySeed.lots.find((lot) => lot.projectId === project.id)!.id, ...links, priority: "High" as const, title: "Mirror arrived cracked", description: "Crack visible across the lower corner.", blocking: true, operatorName: "Receiving Operator", clientMutationId: "damage-mirror-1" }

    await expect(service.recordIssue({ ...base, type: "Damaged" })).rejects.toThrow("damage photo is required")
    expect((await service.load()).issues).toHaveLength(inventorySeed.issues.length)

    const damaged = await service.recordIssue({ ...base, type: "Damaged", file: new File(["damage evidence"], "mirror-damage.jpg", { type: "image/jpeg" }), photoType: "Condition" })
    const issue = damaged.issues.find((item) => item.idempotencyKey === base.clientMutationId)!
    expect(issueEvidenceState(damaged, issue)).toBe("Complete")
    expect(issue.photoIds).toHaveLength(1)
    expect(await service.getPhoto(damaged.photos.find((photo) => photo.id === issue.photoIds[0])!.blobKey)).toBeInstanceOf(Blob)

    const replayed = await service.recordIssue({ ...base, type: "Damaged", file: new File(["different bytes"], "duplicate.jpg", { type: "image/jpeg" }) })
    expect(replayed.issues.filter((item) => item.idempotencyKey === base.clientMutationId)).toHaveLength(1)
    expect(replayed.photos).toHaveLength(damaged.photos.length)

    const optional = await service.recordIssue({ ...base, type: "Wrong quantity", title: "Count differs from paperwork", clientMutationId: "wrong-quantity-1", file: null })
    expect(issueEvidenceState(optional, optional.issues.find((item) => item.idempotencyKey === "wrong-quantity-1")!)).toBe("Optional")

    const backup = await service.exportBackup()
    const restoredService = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const restored = await restoredService.importBackup(new File([backup], "phase-5-backup.json", { type: "application/json" }))
    const restoredIssue = restored.issues.find((item) => item.id === issue.id)!
    expect(restoredIssue.photoIds).toEqual(issue.photoIds)
    expect(restored.issueTransitions.some((transition) => transition.issueId === issue.id && transition.kind === "Created")).toBe(true)
    expect(await restoredService.getPhoto(restored.photos.find((photo) => photo.id === restoredIssue.photoIds[0])!.blobKey)).toBeInstanceOf(Blob)
  })

  it("preserves assignment, discussion, resolution, and reopen as immutable history", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    const created = await service.recordIssue({ siteId: project.siteId, projectId: project.id, lotId: null, ...links, type: "Weather exposure", priority: "Normal", title: "Cover needs attention", description: "Inspect before the next rain.", blocking: false, operatorName: "Yard Operator", clientMutationId: "weather-follow-up-1" })
    const issueId = created.issues.find((item) => item.idempotencyKey === "weather-follow-up-1")!.id

    await service.assignIssue({ issueId, assigneeName: "Shift Lead", operatorName: "Yard Operator" })
    await service.addIssueComment({ issueId, body: "Supplier was contacted; awaiting return instructions.", operatorName: "Shift Lead" })
    await service.transitionIssue({ issueId, toStatus: "In Progress", note: "Return coordination started.", operatorName: "Shift Lead" })
    await service.transitionIssue({ issueId, toStatus: "Resolved", note: "Material protected and supplier follow-up documented.", operatorName: "Shift Lead" })
    const reopened = await service.transitionIssue({ issueId, toStatus: "Open", note: "Protection failed field recheck.", operatorName: "Yard Manager" })

    expect(reopened.issues.find((issue) => issue.id === issueId)).toMatchObject({ status: "Open", assigneeName: "Shift Lead", resolutionNote: null })
    expect(reopened.issueComments.filter((comment) => comment.issueId === issueId)).toHaveLength(1)
    expect(reopened.issueTransitions.filter((transition) => transition.issueId === issueId).map((transition) => transition.kind)).toEqual(["Created", "Assigned", "Status changed", "Status changed", "Status changed"])
    expect(reopened.activities.filter((activity) => activity.entityId === issueId).map((activity) => activity.type)).toEqual(["Issue recorded", "Issue assigned", "Issue commented", "Issue status changed", "Issue status changed", "Issue status changed"])
  })

  it("reuses required receiving photos for automatic damage Issues without duplicating media", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    const draft = await service.saveReceiptDraft({ siteId: project.siteId, receiptNumber: "RCV-DAMAGED-MIRROR", projectId: project.id, inspectionState: "Exception", handwrittenProjectText: project.name, physicalLabelApplied: true, stagingLocationId: inventorySeed.locations[0].id, notes: "Damage found at unloading.", operatorName: "Receiving Operator", lines: [{ materialName: "Glass mirror", description: "Lower corner cracked", packageType: "Crate", quantity: 1, condition: "Damaged", protection: "Covered", accessibility: "Accessible", handlingRequirements: ["Glass handling"], targetLocationId: inventorySeed.locations[0].id, file: new File(["receiving damage"], "received-mirror.jpg", { type: "image/jpeg" }), photoType: "Material" }] })
    const receipt = draft.receipts.find((item) => item.receiptNumber === "RCV-DAMAGED-MIRROR")!
    const line = draft.receiptLines.find((item) => item.receiptId === receipt.id)!
    const beforePhotoCount = draft.photos.length
    const received = await service.completeReceipt(receipt.id, "Receiving Operator")
    const issue = received.issues.find((item) => item.receiptId === receipt.id && item.type === "Damaged")!

    expect(received.photos).toHaveLength(beforePhotoCount)
    expect(issue.photoIds).toEqual(line.photoIds)
    expect(received.photos.find((photo) => photo.id === line.photoIds[0])).toMatchObject({ issueId: issue.id, receiptId: receipt.id, lotId: issue.lotId })
    expect(issueEvidenceState(received, issue)).toBe("Complete")
  })

  it("resolves an unknown shipment by linking its receipt without rewriting original evidence", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const fieldText = "Handwritten: PW mirrors"
    const draft = await service.saveReceiptDraft({ siteId: inventorySeed.sites[0].id, receiptNumber: "RCV-UNKNOWN-1", projectId: null, inspectionState: "Pending", handwrittenProjectText: fieldText, physicalLabelApplied: true, stagingLocationId: inventorySeed.locations[0].id, notes: "Project not confirmed at unloading.", operatorName: "Receiving Operator", lines: [{ materialName: "Mirror crates", description: "Project pending", packageType: "Crate", quantity: null, condition: "Needs inspection", protection: "Covered", accessibility: "Accessible", handlingRequirements: ["Glass handling"], targetLocationId: inventorySeed.locations[0].id, file: new File(["unknown shipment"], "unknown-material.jpg", { type: "image/jpeg" }), photoType: "Material" }] })
    const receiptId = draft.receipts.find((receipt) => receipt.receiptNumber === "RCV-UNKNOWN-1")!.id
    const received = await service.completeReceipt(receiptId, "Receiving Operator")
    const issue = received.issues.find((item) => item.receiptId === receiptId && item.type === "Unknown shipment")!
    const project = inventorySeed.projects[0]
    const resolved = await service.transitionIssue({ issueId: issue.id, toStatus: "Resolved", note: "Project confirmed from packing slip follow-up.", resolvedProjectId: project.id, operatorName: "Yard Manager" })
    const receipt = resolved.receipts.find((item) => item.id === receiptId)!

    expect(receipt).toMatchObject({ projectId: project.id, identityState: "Matched", handwrittenProjectText: fieldText })
    expect(resolved.issues.find((item) => item.id === issue.id)).toMatchObject({ projectId: project.id, status: "Resolved" })
    expect(resolved.issueTransitions.filter((transition) => transition.issueId === issue.id).map((transition) => transition.kind)).toEqual(["Created", "Linked", "Status changed"])
  })

  it("treats Open and In Progress blocking Issues as readiness blockers until resolved", async () => {
    const service = createInventoryService(new MemoryInventoryPersistence(), inventorySeed)
    const project = inventorySeed.projects[0]
    const created = await service.recordIssue({ siteId: project.siteId, projectId: project.id, lotId: null, ...links, type: "Blocked access", priority: "Urgent", title: "Outbound aisle obstructed", description: "Forklift cannot reach the project stack.", blocking: true, operatorName: "Yard Operator", clientMutationId: "readiness-lifecycle-1" })
    const issueId = created.issues.find((item) => item.idempotencyKey === "readiness-lifecycle-1")!.id
    expect(projectReadiness(created, project.id).blockingIssues.some((issue) => issue.id === issueId)).toBe(true)

    const active = await service.transitionIssue({ issueId, toStatus: "In Progress", note: "Clearing aisle now.", operatorName: "Shift Lead" })
    expect(projectReadiness(active, project.id).blockingIssues.some((issue) => issue.id === issueId)).toBe(true)

    const resolved = await service.transitionIssue({ issueId, toStatus: "Resolved", note: "Aisle cleared and access confirmed.", operatorName: "Shift Lead" })
    expect(projectReadiness(resolved, project.id).blockingIssues.some((issue) => issue.id === issueId)).toBe(false)
  })
})
