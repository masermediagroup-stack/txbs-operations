import { describe, expect, it } from "vitest"

import type { MobileCacheManifest, QueuedMutation, QueuedPhoto, SyncConflict } from "@/features/mobile/domain/mobile-sync"
import type { MobileSyncPersistence } from "@/features/mobile/repositories/mobile-sync-persistence"
import { buildQueuedMutation, formatBytes, MobileSyncJournal } from "@/features/mobile/services/mobile-sync-journal"
import { prepareQueuedCommandPayload, queuedPhotoFormData, sameOriginApiUrl } from "@/features/mobile/services/mobile-sync-transport"

const siteId = "10000000-0000-4000-8000-000000000001"
const lotId = "10000000-0000-4000-8000-000000000002"
const mutationId = "10000000-0000-4000-8000-000000000003"

const actor = {
  userId: null,
  email: null,
  displayName: "Test Operator",
  role: null,
} as const

class MemoryMobileSyncPersistence implements MobileSyncPersistence {
  mutations: QueuedMutation[] = []
  photos: QueuedPhoto[] = []
  conflicts: SyncConflict[] = []
  manifest: MobileCacheManifest | null = null

  async listMutations() { return structuredClone(this.mutations) }
  async listPhotos() { return [...this.photos] }
  async listConflicts() { return structuredClone(this.conflicts) }
  async enqueue(mutation: QueuedMutation, photos: QueuedPhoto[]) { this.mutations.push(structuredClone(mutation)); this.photos.push(...photos) }
  async putMutation(mutation: QueuedMutation) { this.mutations = this.mutations.filter((item) => item.id !== mutation.id).concat(structuredClone(mutation)) }
  async removeMutation(id: string) { this.mutations = this.mutations.filter((item) => item.id !== id); this.photos = this.photos.filter((photo) => photo.mutationId !== id) }
  async removePhoto(id: string) { this.photos = this.photos.filter((photo) => photo.id !== id) }
  async putConflict(conflict: SyncConflict) { this.conflicts = this.conflicts.filter((item) => item.id !== conflict.id).concat(structuredClone(conflict)) }
  async removeConflict(id: string) { this.conflicts = this.conflicts.filter((item) => item.id !== id) }
  async getManifest() { return this.manifest ? structuredClone(this.manifest) : null }
  async putManifest(manifest: MobileCacheManifest) { this.manifest = structuredClone(manifest) }
  async clear() { this.mutations = []; this.photos = []; this.conflicts = []; this.manifest = null }
}

describe("Phase 7 mobile sync journal", () => {
  it("serializes a physical movement and retains multiple optional photos separately", () => {
    const files = [1, 2, 3].map((number) => new File([`yard proof ${number}`], `move-${number}.jpg`, { type: "image/jpeg" }))
    const { mutation, photos } = buildQueuedMutation({
      clientMutationId: mutationId,
      commandType: "movement.create",
      siteId,
      actor,
      entityIds: [lotId, lotId],
      entityBaseVersions: { [lotId]: 4 },
      payload: { reason: "Move for access", lines: [{ lotId, expectedVersion: 4 }], files },
    }, "2026-08-12T14:00:00.000Z")

    expect(mutation.clientMutationId).toBe(mutationId)
    expect(mutation.entityIds).toEqual([lotId])
    expect(mutation.entityBaseVersions).toEqual({ [lotId]: 4 })
    expect(mutation.state).toBe("pending")
    expect(mutation.photoIds).toEqual(photos.map((photo) => photo.id))
    expect(mutation.payload.files).toEqual(photos.map((photo) => ({ queuedPhotoId: photo.id })))
    expect(photos[0]).toMatchObject({ fileName: "move-1.jpg", contentType: "image/jpeg", fieldPath: "files[0]", state: "pending" })
    expect(photos.map((photo) => photo.blob)).toEqual(files)
  })

  it("deduplicates replay envelopes by client mutation ID", async () => {
    const persistence = new MemoryMobileSyncPersistence()
    const journal = new MobileSyncJournal(persistence)
    const input = { clientMutationId: mutationId, commandType: "verification.confirm" as const, siteId, actor, entityIds: [lotId], entityBaseVersions: { [lotId]: 2 }, payload: { lotId } }

    const first = await journal.enqueue(input)
    const second = await journal.enqueue(input)

    expect(second.id).toBe(first.id)
    expect((await journal.snapshot()).mutations).toHaveLength(1)
  })

  it("prepares a separately versioned cache manifest without clearing pending work", async () => {
    const persistence = new MemoryMobileSyncPersistence()
    const journal = new MobileSyncJournal(persistence)
    await journal.enqueue({ clientMutationId: mutationId, commandType: "issue.record", siteId, actor, entityIds: [lotId], payload: { title: "Blocked access" } })

    const manifest = await journal.prepare({ userId: null, siteIds: [siteId], inventoryRevision: 12 })
    const snapshot = await journal.snapshot()

    expect(manifest).toMatchObject({ schemaVersion: 1, siteIds: [siteId], inventoryRevision: 12 })
    expect(snapshot.mutations).toHaveLength(1)
    expect(snapshot.manifest).toEqual(manifest)
  })

  it("formats browser storage totals for the sync sheet", () => {
    expect(formatBytes(0)).toBe("0 MB")
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB")
    expect(formatBytes(25.4 * 1024 * 1024)).toBe("25 MB")
  })

  it("rebuilds a queued photo as Safari-safe multipart data", () => {
    const photo: QueuedPhoto = {
      id: mutationId,
      mutationId,
      fieldPath: "files[0]",
      fileName: "IMG 1001 (yard).jpg",
      contentType: "image/jpeg",
      size: 5,
      createdAt: "2026-08-25T13:56:00.000Z",
      state: "pending",
      retryCount: 0,
      lastError: null,
      blob: new Blob(["photo"], { type: "image/jpeg" }),
    }

    const form = queuedPhotoFormData(photo, mutationId, siteId)
    const file = form.get("file")
    expect(file).toBeInstanceOf(File)
    expect((file as File).name).toBe("IMG-1001-yard-.jpg")
    expect((file as File).type).toBe("image/jpeg")
    expect(sameOriginApiUrl("/api/inventory/uploads", "https://tbs.example/inventory/movements")).toBe("https://tbs.example/api/inventory/uploads")
  })

  it("maps queued Movement photos to the shared command contract", () => {
    const upload = { id: mutationId, fileName: "move.jpg" }
    const payload = prepareQueuedCommandPayload("movement.create", {
      reason: "Clear access",
      note: "Moved with proof",
      photoType: "Location",
      files: [{ queuedPhotoId: mutationId }],
      lines: [{ lotId, quantity: 1, expectedVersion: 4 }],
    }, new Map([[mutationId, upload]]))

    expect(payload.photoUploads).toEqual([{ ...upload, photoType: "Location", caption: "Moved with proof" }])
  })
})
