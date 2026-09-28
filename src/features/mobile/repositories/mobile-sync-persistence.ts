import { remapQueuedMutation } from "@/features/mobile/domain/replay-identity"
import type { MobileCacheManifest, QueuedMutation, QueuedPhoto, SyncConflict } from "@/features/mobile/domain/mobile-sync"
import { openScopedDatabase, storeQueuedPhotos, type StoredQueuedPhoto } from "./scoped-database"

const MUTATION_STORE = "mutations"
const PHOTO_STORE = "queued-photos"
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
  acknowledgeMutation?(mutation: QueuedMutation, mapping: Record<string, string>): Promise<void>
  removeMutation(id: string): Promise<void>
  removePhoto(id: string): Promise<void>
  putConflict(conflict: SyncConflict): Promise<void>
  removeConflict(id: string): Promise<void>
  getManifest(): Promise<MobileCacheManifest | null>
  putManifest(manifest: MobileCacheManifest): Promise<void>
  clear(): Promise<void>
}

export class IndexedDbMobileSyncPersistence implements MobileSyncPersistence {
  constructor(private readonly scope = "local") {}

  private database() { return openScopedDatabase(this.scope) }

  private async list<T>(storeName: string) {
    const database = await this.database()
    const transaction = database.transaction(storeName, "readonly")
    const done = transactionDone(transaction)
    const records = await requestResult<T[]>(transaction.objectStore(storeName).getAll())
    await done
    return records
  }

  async listMutations() {
    return (await this.list<QueuedMutation>(MUTATION_STORE)).toSorted((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  }

  async listPhotos() {
    return (await this.list<StoredQueuedPhoto>(PHOTO_STORE)).map(({ bytes, ...photo }) => ({ ...photo, blob: new Blob([bytes], { type: photo.contentType }) }))
  }

  async listConflicts() {
    return (await this.list<SyncConflict>(CONFLICT_STORE)).toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }

  async enqueue(mutation: QueuedMutation, photos: QueuedPhoto[]) {
    const storedPhotos = await storeQueuedPhotos(photos)
    const database = await this.database()
    const transaction = database.transaction([MUTATION_STORE, PHOTO_STORE], "readwrite")
    transaction.objectStore(MUTATION_STORE).put(mutation)
    for (const photo of storedPhotos) transaction.objectStore(PHOTO_STORE).put(photo)
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
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([MUTATION_STORE, PHOTO_STORE], "readwrite")
      transaction.objectStore(MUTATION_STORE).delete(id)
      const photoStore = transaction.objectStore(PHOTO_STORE)
      const request = photoStore.getAll() as IDBRequest<QueuedPhoto[]>
      request.onsuccess = () => {
        for (const photo of request.result) if (photo.mutationId === id) photoStore.delete(photo.id)
      }
      request.onerror = () => reject(request.error ?? new Error("Mobile storage request failed."))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error("Mobile storage transaction failed."))
      transaction.onabort = () => reject(transaction.error ?? new Error("Mobile storage transaction was aborted."))
    })
  }

  async acknowledgeMutation(mutation: QueuedMutation, mapping: Record<string, string>) {
    const database = await this.database()
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction([MUTATION_STORE, PHOTO_STORE], "readwrite")
      const store = tx.objectStore(MUTATION_STORE)
      const read = store.getAll() as IDBRequest<QueuedMutation[]>
      read.onsuccess = () => {
        for (const queued of read.result) {
          if (queued.id === mutation.id) store.delete(queued.id)
          else store.put(remapQueuedMutation(queued, mapping))
        }
        for (const photo of mutation.photoIds) tx.objectStore(PHOTO_STORE).delete(photo)
      }
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = () => reject(tx.error)
    })
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
    const done = transactionDone(transaction)
    const manifest = await requestResult<MobileCacheManifest | undefined>(transaction.objectStore(META_STORE).get(MANIFEST_KEY))
    await done
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
