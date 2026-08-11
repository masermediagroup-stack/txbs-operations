import type { InventorySnapshot } from "@/features/inventory/domain/inventory"
import { StaleInventoryError, type InventoryPersistence, type PhotoBlob } from "@/features/inventory/repositories/inventory-persistence"

export class MemoryInventoryPersistence implements InventoryPersistence {
  private snapshot: InventorySnapshot | null = null
  private photos = new Map<string, Blob>()

  async load(seed: InventorySnapshot) { this.snapshot ??= structuredClone(seed); return structuredClone(this.snapshot) }
  async commit(expectedRevision: number, snapshot: InventorySnapshot, blobs: PhotoBlob[] = []) {
    if (this.snapshot && this.snapshot.revision !== expectedRevision) throw new StaleInventoryError()
    this.snapshot = structuredClone(snapshot)
    for (const photo of blobs) this.photos.set(photo.key, photo.blob)
  }
  async getPhoto(key: string) { return this.photos.get(key) ?? null }
  async getAllPhotos() { return [...this.photos].map(([key, blob]) => ({ key, blob })) }
  async replace(snapshot: InventorySnapshot, blobs: PhotoBlob[]) { this.snapshot = structuredClone(snapshot); this.photos = new Map(blobs.map((item) => [item.key, item.blob])) }
}
