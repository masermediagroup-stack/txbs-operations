import type { ReactNode } from "react"

import { InventoryProvider } from "@/features/inventory/components/inventory-provider"
import { inventorySeed } from "@/features/inventory/data/seed-data"

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return <InventoryProvider seed={inventorySeed}>{children}</InventoryProvider>
}
