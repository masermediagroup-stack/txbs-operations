import { MOBILE_COMMAND_VERSION, MOBILE_SYNC_DATABASE_VERSION, queuedMutationSchema, type JournalExport, type MobileCacheManifest, type QueueMutationInput, type QueuedMutation, type QueuedPhoto } from "@/features/mobile/domain/mobile-sync"
import type { MobileSyncPersistence } from "@/features/mobile/repositories/mobile-sync-persistence"

type SerializedValue = null | boolean | number | string | SerializedValue[] | { [key: string]: SerializedValue }

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob
}

function fileName(value: Blob) {
  return isFile(value) ? value.name : "capture"
}

function serialize(value: unknown, path: string, mutationId: string, now: string, photos: QueuedPhoto[]): SerializedValue {
  if (value === undefined) return null
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return value
  if (isFile(value) || isBlob(value)) {
    const id = crypto.randomUUID()
    photos.push({
      id,
      mutationId,
      fieldPath: path,
      fileName: fileName(value),
      contentType: value.type || "application/octet-stream",
      size: value.size,
      createdAt: now,
      state: "pending",
      retryCount: 0,
      lastError: null,
      blob: value,
    })
    return { queuedPhotoId: id }
  }
  if (Array.isArray(value)) return value.map((item, index) => serialize(item, `${path}[${index}]`, mutationId, now, photos))
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item, path ? `${path}.${key}` : key, mutationId, now, photos)]))
  }
  return String(value)
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function buildQueuedMutation(input: QueueMutationInput, now = new Date().toISOString()) {
  const id = crypto.randomUUID()
  const clientMutationId = input.clientMutationId ?? crypto.randomUUID()
  const photos: QueuedPhoto[] = []
  const payload = serialize(input.payload, "", id, now, photos) as Record<string, unknown>
  const mutation = queuedMutationSchema.parse({
    id,
    clientMutationId,
    commandType: input.commandType,
    commandVersion: MOBILE_COMMAND_VERSION,
    siteId: input.siteId,
    actor: input.actor,
    createdAt: now,
    updatedAt: now,
    entityIds: [...new Set(input.entityIds ?? [])],
    entityBaseVersions: input.entityBaseVersions ?? {},
    payload,
    photoIds: photos.map((photo) => photo.id),
    retryCount: 0,
    state: "pending",
    lastError: null,
  })
  return { mutation, photos }
}

export class MobileSyncJournal {
  constructor(private readonly persistence: MobileSyncPersistence) {}

  async snapshot() {
    const [mutations, photos, conflicts, manifest] = await Promise.all([
      this.persistence.listMutations(),
      this.persistence.listPhotos(),
      this.persistence.listConflicts(),
      this.persistence.getManifest(),
    ])
    return { mutations, photos, conflicts, manifest }
  }

  async enqueue(input: QueueMutationInput) {
    const current = await this.persistence.listMutations()
    const clientMutationId = input.clientMutationId ?? crypto.randomUUID()
    const duplicate = current.find((mutation) => mutation.clientMutationId === clientMutationId)
    if (duplicate) return duplicate
    const { mutation, photos } = buildQueuedMutation({ ...input, clientMutationId })
    await this.persistence.enqueue(mutation, photos)
    return mutation
  }

  async markBlocked(mutation: QueuedMutation, reason: string) {
    const blocked: QueuedMutation = {
      ...mutation,
      state: "blocked",
      retryCount: mutation.retryCount + 1,
      lastError: reason,
      updatedAt: new Date().toISOString(),
    }
    await this.persistence.putMutation(blocked)
    return blocked
  }

  async completeMutation(mutation: QueuedMutation) {
    for (const photoId of mutation.photoIds) await this.persistence.removePhoto(photoId)
    await this.persistence.removeMutation(mutation.id)
  }

  async addConflict(conflict: Parameters<MobileSyncPersistence["putConflict"]>[0]) {
    await this.persistence.putConflict(conflict)
  }

  async discardMutation(id: string) {
    await this.persistence.removeMutation(id)
  }

  async discardConflict(id: string) {
    await this.persistence.removeConflict(id)
  }

  async prepare(manifest: Omit<MobileCacheManifest, "schemaVersion" | "preparedAt">) {
    const record: MobileCacheManifest = {
      ...manifest,
      schemaVersion: MOBILE_SYNC_DATABASE_VERSION,
      preparedAt: new Date().toISOString(),
    }
    await this.persistence.putManifest(record)
    return record
  }

  async export() {
    const { mutations, photos, conflicts, manifest } = await this.snapshot()
    const archive: JournalExport = {
      format: "tbs-mobile-journal",
      schemaVersion: MOBILE_SYNC_DATABASE_VERSION,
      exportedAt: new Date().toISOString(),
      mutations,
      photos: await Promise.all(photos.map(async ({ blob, ...photo }) => ({
        ...photo,
        base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
      }))),
      conflicts,
      manifest,
    }
    return new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" })
  }
}

export function formatBytes(value: number | null | undefined) {
  if (!value || value < 1) return "0 MB"
  const megabytes = value / (1024 * 1024)
  if (megabytes < 10) return `${megabytes.toFixed(1)} MB`
  return `${Math.round(megabytes)} MB`
}
