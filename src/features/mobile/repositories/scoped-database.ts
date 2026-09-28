import { LEGACY_DATABASE_NAMES } from "@/features/mobile/domain/legacy-recovery"

const connections = new Map<string, Promise<IDBDatabase>>()
export const SCOPED_STORES = ["snapshot", "photos", "mutations", "queued-photos", "conflicts", "meta"] as const

export async function hasLegacyDeviceData() {
  if (typeof indexedDB.databases !== "function") return false
  const databases = await indexedDB.databases()
  return databases.some(({ name }) => LEGACY_DATABASE_NAMES.some((legacyName) => legacyName === name))
}

/** Legacy unscoped databases are deliberately retained, never adopted by a new account. */
export function openScopedDatabase(scope: string) {
  if (!scope) throw new Error("An account/environment storage scope is required.")
  const name = `tbs-operations-v2:${encodeURIComponent(scope)}`
  let connection = connections.get(name)
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1)
      request.onupgradeneeded = () => {
        for (const store of SCOPED_STORES) {
          request.result.createObjectStore(store, ["mutations", "queued-photos", "conflicts"].includes(store) ? { keyPath: "id" } : undefined)
        }
      }
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); connections.delete(name) }
        resolve(request.result)
      }
      request.onerror = () => { connections.delete(name); reject(request.error) }
      request.onblocked = () => reject(new Error("Close other TBS tabs to update device storage."))
    })
    connections.set(name, connection)
  }
  return connection
}

export type StoredQueuedPhoto = Omit<import("@/features/mobile/domain/mobile-sync").QueuedPhoto, "blob"> & { bytes: ArrayBuffer }

export async function storeQueuedPhotos(photos: import("@/features/mobile/domain/mobile-sync").QueuedPhoto[]): Promise<StoredQueuedPhoto[]> {
  return Promise.all(photos.map(async ({ blob, ...photo }) => ({ ...photo, bytes: await blob.arrayBuffer() })))
}

export async function withDeviceLock<T>(scope: string, work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request(`tbs-device:${scope}`, work)
  // Unsupported browsers must not risk concurrent journal writes.
  throw new Error("This browser cannot safely coordinate offline work. Use a current browser.")
}
