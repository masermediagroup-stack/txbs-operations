import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { InventoryProvider } from "@/features/inventory/components/inventory-provider"
import { inventorySeed } from "@/features/inventory/data/seed-data"
import { getCurrentOperator } from "@/features/auth/server/session"

export default async function InventoryLayout({ children }: { children: ReactNode }) {
  const operator = await getCurrentOperator()
  if (operator?.role === "Tech") redirect("/")
  return <InventoryProvider seed={inventorySeed} backend={operator ? "supabase" : "local"}>{children}</InventoryProvider>
}
