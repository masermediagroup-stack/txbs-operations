import { migrateInventorySnapshot, type InventorySnapshot } from "@/features/inventory/domain/inventory"
import { StaleInventoryError, type InventoryPersistence, type PhotoBlob } from "@/features/inventory/repositories/inventory-persistence"

const DATABASE_NAME = "tbs-operations-inventory"
const DATABASE_VERSION = 6
const SNAPSHOT_STORE = "snapshot"
const PHOTO_STORE = "photos"
const SNAPSHOT_KEY = "current"

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
  private databasePromise: Promise<IDBDatabase> | null = null

  private database() {
    if (this.databasePromise) return this.databasePromise
    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(SNAPSHOT_STORE)) database.createObjectStore(SNAPSHOT_STORE)
        if (!database.objectStoreNames.contains(PHOTO_STORE)) database.createObjectStore(PHOTO_STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error("Could not open local inventory storage."))
    })
    return this.databasePromise
  }

  async load(seed: InventorySnapshot) {
    const database = await this.database()
    const transaction = database.transaction(SNAPSHOT_STORE, "readwrite")
    const store = transaction.objectStore(SNAPSHOT_STORE)
    const existing = await requestResult<InventorySnapshot | undefined>(store.get(SNAPSHOT_KEY))
    if (existing) {
      const migrated = migrateInventorySnapshot(existing)
      if (existing.schemaVersion !== migrated.schemaVersion) store.put(migrated, SNAPSHOT_KEY)
      await transactionDone(transaction)
      return migrated
    }
    store.put(seed, SNAPSHOT_KEY)
    await transactionDone(transaction)
    return seed
  }

  async commit(expectedRevision: number, snapshot: InventorySnapshot, blobs: PhotoBlob[] = []) {
    const database = await this.database()
    const transaction = database.transaction([SNAPSHOT_STORE, PHOTO_STORE], "readwrite")
    const snapshotStore = transaction.objectStore(SNAPSHOT_STORE)
    const current = await requestResult<InventorySnapshot | undefined>(snapshotStore.get(SNAPSHOT_KEY))
    if (current && current.revision !== expectedRevision) {
      transaction.abort()
      throw new StaleInventoryError()
    }
    snapshotStore.put(snapshot, SNAPSHOT_KEY)
    const photoStore = transaction.objectStore(PHOTO_STORE)
    for (const photo of blobs) photoStore.put(photo.blob, photo.key)
    await transactionDone(transaction)
  }

  async getPhoto(key: string) {
    const database = await this.database()
    const transaction = database.transaction(PHOTO_STORE, "readonly")
    const result = await requestResult<Blob | undefined>(transaction.objectStore(PHOTO_STORE).get(key))
    await transactionDone(transaction)
    return result ?? null
  }

  async getAllPhotos() {
    const database = await this.database()
    const transaction = database.transaction(PHOTO_STORE, "readonly")
    const store = transaction.objectStore(PHOTO_STORE)
    const [keys, blobs] = await Promise.all([requestResult<IDBValidKey[]>(store.getAllKeys()), requestResult<Blob[]>(store.getAll())])
    await transactionDone(transaction)
    return keys.map((key, index) => ({ key: String(key), blob: blobs[index] }))
  }

  async replace(snapshot: InventorySnapshot, blobs: PhotoBlob[]) {
    const database = await this.database()
    const transaction = database.transaction([SNAPSHOT_STORE, PHOTO_STORE], "readwrite")
    transaction.objectStore(SNAPSHOT_STORE).put(snapshot, SNAPSHOT_KEY)
    const photoStore = transaction.objectStore(PHOTO_STORE)
    photoStore.clear()
    for (const photo of blobs) photoStore.put(photo.blob, photo.key)
    await transactionDone(transaction)
  }
}
