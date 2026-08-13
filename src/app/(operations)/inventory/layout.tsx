import type { ReactNode } from "react"

import { InventoryProvider } from "@/features/inventory/components/inventory-provider"
import { inventorySeed } from "@/features/inventory/data/seed-data"
import { getCurrentOperator } from "@/features/auth/server/session"

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const operator = await getCurrentOperator()
  return <InventoryProvider seed={inventorySeed} backend={operator ? "supabase" : "local"}>{children}</InventoryProvider>
}
