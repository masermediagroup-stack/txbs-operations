import { describe, expect, it } from "vitest"

import { initialInventorySnapshot } from "@/features/inventory/components/inventory-provider"
import { inventorySeed } from "@/features/inventory/data/seed-data"

describe("InventoryProvider shared-data startup", () => {
  it("uses seed data immediately for the device-local workspace", () => {
    expect(initialInventorySnapshot("local", inventorySeed)).toBe(inventorySeed)
  })

  it("does not present bundled seed data as an authenticated shared snapshot", () => {
    expect(initialInventorySnapshot("supabase", inventorySeed)).toBeUndefined()
  })
})
