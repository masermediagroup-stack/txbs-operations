import { recordCreatedEntities } from "@/features/mobile/domain/replay-identity"
import { migrateInventorySnapshot, type InventorySnapshot } from "@/features/inventory/domain/inventory"
import { StaleInventoryError, type InventoryPersistence, type PhotoBlob } from "@/features/inventory/repositories/inventory-persistence"

import { openScopedDatabase, storeQueuedPhotos } from "@/features/mobile/repositories/scoped-database"
import type { QueuedMutation, QueuedPhoto } from "@/features/mobile/domain/mobile-sync"
const SNAPSHOT_STORE = "snapshot"
const PHOTO_STORE = "photos"
const SNAPSHOT_KEY = "current"

type StoredPhoto = {
  bytes: ArrayBuffer
  type: string
}

async function serializePhotos(photos: PhotoBlob[]) {
  return Promise.all(
    photos.map(async ({ key, blob }) => ({
      key,
      value: { bytes: await blob.arrayBuffer(), type: blob.type } satisfies StoredPhoto,
    })),
  )
}

function restorePhoto(value: Blob | StoredPhoto) {
  return value instanceof Blob ? value : new Blob([value.bytes], { type: value.type })
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."))
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."))
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted."))
  })
}

export class IndexedDbInventoryPersistence implements InventoryPersistence {
  constructor(private readonly scope = "local") {}
  private pending: { mutation: QueuedMutation; photos: QueuedPhoto[] } | null = null
  private database() { return openScopedDatabase(this.scope) }

  async withQueuedCommand(mutation: QueuedMutation, photos: QueuedPhoto[], work: () => Promise<void>) {
    if (this.pending) throw new Error("Another local command is being saved.")
    this.pending = { mutation, photos }
    try { await work() } finally { this.pending = null }
  }

  async requirePreparedSnapshot() {
    const database = await this.database()
    const transaction = database.transaction(SNAPSHOT_STORE, "readonly")
    const done = transactionDone(transaction)
    const snapshot = await requestResult<InventorySnapshot | undefined>(transaction.objectStore(SNAPSHOT_STORE).get(SNAPSHOT_KEY))
    await done
    if (!snapshot) throw new Error("Connect once with this account to prepare inventory for offline work.")
    return migrateInventorySnapshot(snapshot)
  }

  async cacheSharedSnapshot(snapshot: InventorySnapshot) {
    const database = await this.database()
    return new Promise<boolean>((resolve, reject) => {
      const tx = database.transaction([SNAPSHOT_STORE, "mutations"], "readwrite")
      let cached = false
      const pending = tx.objectStore("mutations").count()
      pending.onsuccess = () => {
        if (pending.result === 0) {
          tx.objectStore(SNAPSHOT_STORE).put(snapshot, SNAPSHOT_KEY)
          cached = true
        }
      }
      tx.oncomplete = () => resolve(cached)
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error("Shared inventory could not be cached."))
    })
  }

  async load(seed: InventorySnapshot) {
    const database = await this.database()
    return new Promise<InventorySnapshot>((resolve, reject) => {
      const transaction = database.transaction(SNAPSHOT_STORE, "readwrite")
      const store = transaction.objectStore(SNAPSHOT_STORE)
      let result = seed
      const request = store.get(SNAPSHOT_KEY) as IDBRequest<InventorySnapshot | undefined>
      request.onsuccess = () => {
        try {
          const existing = request.result
          if (existing) {
            result = migrateInventorySnapshot(existing)
            if (existing.schemaVersion !== result.schemaVersion) store.put(result, SNAPSHOT_KEY)
          } else {
            store.put(seed, SNAPSHOT_KEY)
          }
        } catch (error) {
          transaction.abort()
          reject(error)
        }
      }
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."))
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."))
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted."))
    })
  }

  async commit(expectedRevision: number, snapshot: InventorySnapshot, blobs: PhotoBlob[] = []) {
    const database = await this.database()
    // ArrayBuffers are consistently structured-cloneable in Safari/WebKit IndexedDB.
    // Serializing before opening the transaction also prevents async work from
    // allowing WebKit to auto-commit the transaction before the writes are queued.
    const storedPhotos = await serializePhotos(blobs)
    const pending = this.pending
    const queuedPhotos = pending ? await storeQueuedPhotos(pending.photos) : []
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([SNAPSHOT_STORE, PHOTO_STORE, "mutations", "queued-photos"], "readwrite")
      const snapshotStore = transaction.objectStore(SNAPSHOT_STORE)
      const request = snapshotStore.get(SNAPSHOT_KEY) as IDBRequest<InventorySnapshot | undefined>
      let stale = false
      request.onsuccess = () => {
        if (request.result && request.result.revision !== expectedRevision) {
          stale = true
          transaction.abort()
          return
        }
        snapshotStore.put(snapshot, SNAPSHOT_KEY)
        if (pending) {
          transaction.objectStore("mutations").put(recordCreatedEntities(pending.mutation, request.result ?? snapshot, snapshot))
          for (const photo of queuedPhotos) transaction.objectStore("queued-photos").put(photo)
        }
        const photoStore = transaction.objectStore(PHOTO_STORE)
        for (const photo of storedPhotos) photoStore.put(photo.value, photo.key)
      }
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."))
      transaction.onabort = () => reject(stale ? new StaleInventoryError() : transaction.error ?? new Error("IndexedDB transaction was aborted."))
    })
  }

  async getPhoto(key: string) {
    const database = await this.database()
    const transaction = database.transaction(PHOTO_STORE, "readonly")
    const done = transactionDone(transaction)
    const result = await requestResult<Blob | StoredPhoto | undefined>(transaction.objectStore(PHOTO_STORE).get(key))
    await done
    return result ? restorePhoto(result) : null
  }

  async getAllPhotos() {
    const database = await this.database()
    const transaction = database.transaction(PHOTO_STORE, "readonly")
    const done = transactionDone(transaction)
    const store = transaction.objectStore(PHOTO_STORE)
    const [keys, blobs] = await Promise.all([
      requestResult<IDBValidKey[]>(store.getAllKeys()),
      requestResult<Array<Blob | StoredPhoto>>(store.getAll()),
    ])
    await done
    return keys.map((key, index) => ({ key: String(key), blob: restorePhoto(blobs[index]) }))
  }

  async replace(snapshot: InventorySnapshot, blobs: PhotoBlob[]) {
    const database = await this.database()
    const storedPhotos = await serializePhotos(blobs)
    const transaction = database.transaction([SNAPSHOT_STORE, PHOTO_STORE], "readwrite")
    transaction.objectStore(SNAPSHOT_STORE).put(snapshot, SNAPSHOT_KEY)
    const photoStore = transaction.objectStore(PHOTO_STORE)
    photoStore.clear()
    for (const photo of storedPhotos) photoStore.put(photo.value, photo.key)
    await transactionDone(transaction)
  }
}
