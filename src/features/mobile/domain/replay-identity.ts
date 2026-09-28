import type { InventorySnapshot } from "@/features/inventory/domain/inventory"
import type { QueuedMutation } from "./mobile-sync"

export type CreatedEntity = { kind: "primary" | "receiptLot" | "receiptIssue" | "movementLot" | "outboundLot"; sourceId: string }
export type ReplayEntities = Partial<Record<CreatedEntity["kind"], Record<string, string>>>

/** Capture local identities inside the same transaction as their originating command. */
export function recordCreatedEntities(command: QueuedMutation, before: InventorySnapshot, after: InventorySnapshot): QueuedMutation {
  const createdEntities: Record<string, CreatedEntity> = {}
  const newLots = after.lots.filter((lot) => !before.lots.some((old) => old.id === lot.id))
  const primary = command.commandType === "material.add" ? newLots[0]?.id
    : ["movement.create", "movement.reverse"].includes(command.commandType) ? after.movements.find((item) => !before.movements.some((old) => old.id === item.id))?.id
      : ["outbound.plan", "outbound.reverse"].includes(command.commandType) ? after.outboundBatches.find((item) => !before.outboundBatches.some((old) => old.id === item.id))?.id
        : command.commandType === "issue.record" ? after.issues.find((item) => !before.issues.some((old) => old.id === item.id))?.id : undefined
  if (primary) createdEntities[primary] = { kind: "primary", sourceId: "entity" }
  for (const lot of newLots) {
    if (lot.id === primary) continue
    const movement = after.movementLines.find((line) => line.resultingLotId === lot.id)
    const outbound = after.outboundLines.find((line) => line.resultingLotId === lot.id)
    const receiptLine = after.receiptLines.find((line) => line.photoIds.some((id) => after.photos.some((photo) => photo.id === id && photo.lotId === lot.id)))
    if (movement) createdEntities[lot.id] = { kind: "movementLot", sourceId: movement.sourceLotId }
    else if (outbound) createdEntities[lot.id] = { kind: "outboundLot", sourceId: outbound.sourceLotId }
    else if (receiptLine) createdEntities[lot.id] = { kind: "receiptLot", sourceId: receiptLine.id }
  }
  if (command.commandType === "receipt.complete") {
    for (const issue of after.issues.filter((item) => !before.issues.some((old) => old.id === item.id))) {
      const sourceId = issue.lotId ? createdEntities[issue.lotId]?.sourceId : "unknown"
      if (sourceId) createdEntities[issue.id] = { kind: "receiptIssue", sourceId }
    }
  }
  return { ...command, createdEntities, entityIds: [...new Set([...command.entityIds, ...Object.keys(createdEntities)])] }
}

export function resolveReplayIdentities(command: QueuedMutation, entities: ReplayEntities) {
  const mapping: Record<string, string> = {}
  for (const [localId, descriptor] of Object.entries(command.createdEntities ?? {})) {
    const serverId = entities[descriptor.kind]?.[descriptor.sourceId]
    if (!serverId) throw new Error("The server has not returned all created record identities. Work is retained for retry.")
    mapping[localId] = serverId
  }
  return mapping
}

export function remapQueuedMutation(command: QueuedMutation, mapping: Record<string, string>): QueuedMutation {
  function remap(value: unknown, key = ""): unknown {
    if (typeof value === "string" && /(?:Id|Ids)$/.test(key)) return mapping[value] ?? value
    if (Array.isArray(value)) return value.map((item) => remap(item, key))
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remap(item, key)]))
    return value
  }
  return { ...command, payload: remap(command.payload) as Record<string, unknown>, entityIds: command.entityIds.map((id) => mapping[id] ?? id), entityBaseVersions: Object.fromEntries(Object.entries(command.entityBaseVersions).map(([id, version]) => [mapping[id] ?? id, version])), createdEntities: Object.fromEntries(Object.entries(command.createdEntities ?? {}).map(([id, descriptor]) => [id, { ...descriptor, sourceId: mapping[descriptor.sourceId] ?? descriptor.sourceId }])) }
}
