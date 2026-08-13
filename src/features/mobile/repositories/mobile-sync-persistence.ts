import type { MobileCacheManifest, QueuedMutation, QueuedPhoto, SyncConflict } from "@/features/mobile/domain/mobile-sync"
import { MOBILE_SYNC_DATABASE_VERSION } from "@/features/mobile/domain/mobile-sync"

const DATABASE_NAME = "tbs-operations-mobile"
const MUTATION_STORE = "mutations"
const PHOTO_STORE = "photos"
const CONFLICT_STORE = "conflicts"
const META_STORE = "meta"
const MANIFEST_KEY = "cache-manifest"

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Mobile storage request failed."))
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error("Mobile storage transaction failed."))
    transaction.onabort = () => reject(transaction.error ?? new Error("Mobile storage transaction was aborted."))
  })
}

export interface MobileSyncPersistence {
  listMutations(): Promise<QueuedMutation[]>
  listPhotos(): Promise<QueuedPhoto[]>
  listConflicts(): Promise<SyncConflict[]>
  enqueue(mutation: QueuedMutation, photos: QueuedPhoto[]): Promise<void>
  putMutation(mutation: QueuedMutation): Promise<void>
  removeMutation(id: string): Promise<void>
  removePhoto(id: string): Promise<void>
  putConflict(conflict: SyncConflict): Promise<void>
  removeConflict(id: string): Promise<void>
  getManifest(): Promise<MobileCacheManifest | null>
  putManifest(manifest: MobileCacheManifest): Promise<void>
  clear(): Promise<void>
}

export class IndexedDbMobileSyncPersistence implements MobileSyncPersistence {
  private databasePromise: Promise<IDBDatabase> | null = null

  private database() {
    if (this.databasePromise) return this.databasePromise
    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, MOBILE_SYNC_DATABASE_VERSION)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(MUTATION_STORE)) database.createObjectStore(MUTATION_STORE, { keyPath: "id" })
        if (!database.objectStoreNames.contains(PHOTO_STORE)) database.createObjectStore(PHOTO_STORE, { keyPath: "id" })
        if (!database.objectStoreNames.contains(CONFLICT_STORE)) database.createObjectStore(CONFLICT_STORE, { keyPath: "id" })
        if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error("Could not open mobile yard storage."))
    })
    return this.databasePromise
  }

  private async list<T>(storeName: string) {
    const database = await this.database()
    const transaction = database.transaction(storeName, "readonly")
    const records = await requestResult<T[]>(transaction.objectStore(storeName).getAll())
    await transactionDone(transaction)
    return records
  }

  async listMutations() {
    return (await this.list<QueuedMutation>(MUTATION_STORE)).toSorted((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  }

  async listPhotos() {
    return this.list<QueuedPhoto>(PHOTO_STORE)
  }

  async listConflicts() {
    return (await this.list<SyncConflict>(CONFLICT_STORE)).toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }

  async enqueue(mutation: QueuedMutation, photos: QueuedPhoto[]) {
    const database = await this.database()
    const transaction = database.transaction([MUTATION_STORE, PHOTO_STORE], "readwrite")
    transaction.objectStore(MUTATION_STORE).put(mutation)
    for (const photo of photos) transaction.objectStore(PHOTO_STORE).put(photo)
    await transactionDone(transaction)
  }

  async putMutation(mutation: QueuedMutation) {
    const database = await this.database()
    const transaction = database.transaction(MUTATION_STORE, "readwrite")
    transaction.objectStore(MUTATION_STORE).put(mutation)
    await transactionDone(transaction)
  }

  async removeMutation(id: string) {
    const database = await this.database()
    const transaction = database.transaction([MUTATION_STORE, PHOTO_STORE], "readwrite")
    transaction.objectStore(MUTATION_STORE).delete(id)
    const photos = await requestResult<QueuedPhoto[]>(transaction.objectStore(PHOTO_STORE).getAll())
    for (const photo of photos) if (photo.mutationId === id) transaction.objectStore(PHOTO_STORE).delete(photo.id)
    await transactionDone(transaction)
  }

  async removePhoto(id: string) {
    const database = await this.database()
    const transaction = database.transaction(PHOTO_STORE, "readwrite")
    transaction.objectStore(PHOTO_STORE).delete(id)
    await transactionDone(transaction)
  }

  async putConflict(conflict: SyncConflict) {
    const database = await this.database()
    const transaction = database.transaction(CONFLICT_STORE, "readwrite")
    transaction.objectStore(CONFLICT_STORE).put(conflict)
    await transactionDone(transaction)
  }

  async removeConflict(id: string) {
    const database = await this.database()
    const transaction = database.transaction(CONFLICT_STORE, "readwrite")
    transaction.objectStore(CONFLICT_STORE).delete(id)
    await transactionDone(transaction)
  }

  async getManifest() {
    const database = await this.database()
    const transaction = database.transaction(META_STORE, "readonly")
    const manifest = await requestResult<MobileCacheManifest | undefined>(transaction.objectStore(META_STORE).get(MANIFEST_KEY))
    await transactionDone(transaction)
    return manifest ?? null
  }

  async putManifest(manifest: MobileCacheManifest) {
    const database = await this.database()
    const transaction = database.transaction(META_STORE, "readwrite")
    transaction.objectStore(META_STORE).put(manifest, MANIFEST_KEY)
    await transactionDone(transaction)
  }

  async clear() {
    const database = await this.database()
    const transaction = database.transaction([MUTATION_STORE, PHOTO_STORE, CONFLICT_STORE, META_STORE], "readwrite")
    transaction.objectStore(MUTATION_STORE).clear()
    transaction.objectStore(PHOTO_STORE).clear()
    transaction.objectStore(CONFLICT_STORE).clear()
    transaction.objectStore(META_STORE).clear()
    await transactionDone(transaction)
  }
}

