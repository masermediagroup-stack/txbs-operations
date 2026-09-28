import { openScopedDatabase } from "@/features/mobile/repositories/scoped-database"
import { fieldWorkSnapshotSchema, type FieldWorkSnapshot } from "@/features/field-work/domain/field-work"
import { loadFieldWorkSnapshot } from "./remote-field-work-service"

export async function loadPreparedFieldWork(scope: string, online: boolean): Promise<FieldWorkSnapshot> {
  const db = await openScopedDatabase(scope)
  if (online) {
    const snapshot = await loadFieldWorkSnapshot()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite")
      tx.objectStore("meta").put(snapshot, "field-work")
      tx.oncomplete = () => resolve()
      tx.onabort = tx.onerror = () => reject(tx.error)
    })
    return snapshot
  }
  const value = await new Promise<unknown>((resolve, reject) => {
    const request = db.transaction("meta", "readonly").objectStore("meta").get("field-work")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  if (!value) throw new Error("Connect once to prepare your assignments for offline work.")
  return fieldWorkSnapshotSchema.parse(value)
}
