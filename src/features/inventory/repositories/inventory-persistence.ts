import type { InventorySnapshot } from "@/features/inventory/domain/inventory"

export type PhotoBlob = { key: string; blob: Blob }

export interface InventoryPersistence {
  load(seed: InventorySnapshot): Promise<InventorySnapshot>
  commit(expectedRevision: number, snapshot: InventorySnapshot, blobs?: PhotoBlob[]): Promise<void>
  getPhoto(key: string): Promise<Blob | null>
  getAllPhotos(): Promise<PhotoBlob[]>
  replace(snapshot: InventorySnapshot, blobs: PhotoBlob[]): Promise<void>
}

export class StaleInventoryError extends Error {
  constructor() {
    super("Inventory changed on this device. Refresh and try again.")
    this.name = "StaleInventoryError"
  }
}
