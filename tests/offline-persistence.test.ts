// @vitest-environment node
import "fake-indexeddb/auto"
import { expect, it } from "vitest"
import { inventorySeed } from "@/features/inventory/data/seed-data"
import { IndexedDbInventoryPersistence } from "@/features/inventory/repositories/indexeddb-inventory-persistence"
import { IndexedDbMobileSyncPersistence } from "@/features/mobile/repositories/mobile-sync-persistence"
import { buildQueuedMutation, MobileSyncJournal } from "@/features/mobile/services/mobile-sync-journal"
import { queuedMutationSchema } from "@/features/mobile/domain/mobile-sync"

function queued(scope: string) {
  return buildQueuedMutation({ scope, actor: { userId: crypto.randomUUID(), email: null, displayName: "Operator", role: "Operator" }, siteId: inventorySeed.sites[0].id, commandType: "verification.confirm", payload: { file: new File(["retained evidence"], "evidence.jpg", { type: "image/jpeg" }) } })
}

it("isolates inventory, queued commands and photos by account/environment", async () => {
  const scope = crypto.randomUUID()
  const a = new IndexedDbMobileSyncPersistence(scope)
  const b = new IndexedDbMobileSyncPersistence(scope + "-other")
  const { mutation, photos } = queued(scope)
  await a.enqueue(mutation, photos)
  expect(await b.listMutations()).toHaveLength(0)
  expect(await b.listPhotos()).toHaveLength(0)
  expect(await (await a.listPhotos())[0].blob.text()).toBe("retained evidence")
  const inventoryA = new IndexedDbInventoryPersistence(scope)
  const inventoryB = new IndexedDbInventoryPersistence(scope + "-other")
  await inventoryA.replace({ ...inventorySeed, revision: 92 }, [])
  expect((await inventoryB.load(inventorySeed)).revision).toBe(inventorySeed.revision)
})

it("commits projection, command and evidence together and rejects a stale write atomically", async () => {
  const scope = crypto.randomUUID()
  const persistence = new IndexedDbInventoryPersistence(scope)
  const journal = new IndexedDbMobileSyncPersistence(scope)
  const current = await persistence.load(inventorySeed)
  const first = queued(scope)
  await persistence.withQueuedCommand(first.mutation, first.photos, () => persistence.commit(current.revision, { ...current, revision: current.revision + 1 }))
  expect(await journal.listMutations()).toHaveLength(1)
  const second = queued(scope)
  await expect(persistence.withQueuedCommand(second.mutation, second.photos, () => persistence.commit(current.revision, { ...current, revision: current.revision + 1 }))).rejects.toThrow()
  expect(await journal.listMutations()).toHaveLength(1)
  expect(await journal.listPhotos()).toHaveLength(1)
  expect(await persistence.cacheSharedSnapshot({ ...current, revision: 999 })).toBe(false)
  expect((await persistence.requirePreparedSnapshot()).revision).toBe(current.revision + 1)
})

it("retains conflicted evidence through reload, export and retry until explicit discard", async () => {
  const scope = crypto.randomUUID()
  const persistence = new IndexedDbMobileSyncPersistence(scope)
  const journal = new MobileSyncJournal(persistence)
  const { mutation, photos } = queued(scope)
  const lotId = crypto.randomUUID()
  mutation.entityIds = [lotId]
  mutation.entityBaseVersions = { [lotId]: 7 }
  mutation.payload = { ...mutation.payload, lotId, expectedVersion: 7, quantity: 3 }
  await persistence.enqueue(mutation, photos)
  const conflict = { id: crypto.randomUUID(), mutationId: mutation.id, commandType: mutation.commandType, entityId: null, title: "Changed", localSummary: "Retained", serverSummary: "Version changed", createdAt: new Date().toISOString() }
  await journal.addConflict(conflict)
  await journal.markBlocked(mutation, "Conflict")
  const restored = new MobileSyncJournal(new IndexedDbMobileSyncPersistence(scope))
  const archive = JSON.parse(await (await restored.export()).text())
  expect(archive.mutations).toHaveLength(1)
  expect(archive.photos).toHaveLength(1)
  expect(archive.mutations[0]).toMatchObject({ scope, entityBaseVersions: { [lotId]: 7 }, payload: { lotId, expectedVersion: 7, quantity: 3 } })
  expect(archive.photos[0].base64).toBe(btoa("retained evidence"))
  await restored.retryConflict(conflict.id)
  const retried = await restored.snapshot()
  expect(retried.photos).toHaveLength(1)
  expect(retried.mutations[0]).toMatchObject({ state: "pending", lastError: null, retryCount: 1, entityBaseVersions: { [lotId]: 7 }, payload: { lotId, expectedVersion: 7, quantity: 3 } })
  await restored.addConflict(conflict)
  await restored.discardConflict(conflict.id)
  expect((await restored.snapshot()).photos).toHaveLength(0)
  expect((await restored.snapshot()).conflicts).toHaveLength(0)
})

it("restores queued records and photo bytes before a cache manifest is hydrated", async () => {
  const scope = crypto.randomUUID()
  const persistence = new IndexedDbMobileSyncPersistence(scope)
  const { mutation, photos } = queued(scope)
  await persistence.enqueue(mutation, photos)

  const restored = await new MobileSyncJournal(new IndexedDbMobileSyncPersistence(scope)).snapshot()
  expect(restored.manifest).toBeNull()
  expect(restored.mutations).toEqual([mutation])
  expect(restored.photos).toHaveLength(1)
  expect(await restored.photos[0].blob.text()).toBe("retained evidence")
})


it("reconciles server-created identities and keeps dependent commands durable", async () => {
  const scope = crypto.randomUUID()
  const persistence = new IndexedDbMobileSyncPersistence(scope)
  const journal = new MobileSyncJournal(persistence)
  const localId = crypto.randomUUID()
  const serverId = crypto.randomUUID()
  const first = queued(scope)
  first.mutation.createdEntities = { [localId]: { kind: "primary", sourceId: "entity" } }
  expect(queuedMutationSchema.parse(first.mutation).createdEntities).toEqual(first.mutation.createdEntities)
  first.mutation.entityIds.push(localId)
  await persistence.enqueue(first.mutation, first.photos)
  const second = queued(scope)
  second.mutation.payload = { batchId: localId }
  second.mutation.entityIds = [localId]
  second.mutation.dependsOn = [first.mutation.id]
  await persistence.enqueue(second.mutation, second.photos)
  await expect(journal.discardMutation(first.mutation.id)).rejects.toThrow("dependent")
  await journal.completeMutation(first.mutation, { [localId]: serverId })
  const restored = await new MobileSyncJournal(new IndexedDbMobileSyncPersistence(scope)).snapshot()
  expect(restored.mutations).toHaveLength(1)
  expect(restored.mutations[0].payload.batchId).toBe(serverId)
  expect(restored.mutations[0].entityIds).toEqual([serverId])
  expect(restored.photos).toHaveLength(1)
})

it("rejects unreadable photo bytes without committing either a command or a projection", async () => {
  const scope = crypto.randomUUID()
  const persistence = new IndexedDbInventoryPersistence(scope)
  const current = await persistence.load(inventorySeed)
  const { mutation, photos } = queued(scope)
  Object.defineProperty(photos[0].blob, "arrayBuffer", { value: async () => { throw new Error("Unreadable photo") } })
  await expect(persistence.withQueuedCommand(mutation, photos, () => persistence.commit(current.revision, { ...current, revision: current.revision + 1 }))).rejects.toThrow("Unreadable photo")
  expect((await persistence.load(inventorySeed)).revision).toBe(current.revision)
  expect(await new IndexedDbMobileSyncPersistence(scope).listMutations()).toHaveLength(0)
})

it("rolls back the command, photo and projection when browser storage reports quota exhaustion", async () => {
  const scope = crypto.randomUUID()
  const persistence = new IndexedDbInventoryPersistence(scope)
  const current = await persistence.load(inventorySeed)
  const { mutation, photos } = queued(scope)
  Object.defineProperty(photos[0].blob, "arrayBuffer", {
    value: async () => { throw new DOMException("Storage quota exhausted", "QuotaExceededError") },
  })

  await expect(persistence.withQueuedCommand(mutation, photos, () => persistence.commit(current.revision, { ...current, revision: current.revision + 1 })))
    .rejects.toMatchObject({ name: "QuotaExceededError" })
  expect((await persistence.load(inventorySeed)).revision).toBe(current.revision)
  const journal = await new MobileSyncJournal(new IndexedDbMobileSyncPersistence(scope)).snapshot()
  expect(journal.mutations).toHaveLength(0)
  expect(journal.photos).toHaveLength(0)
})
