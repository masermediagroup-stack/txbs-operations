import type { Metadata } from "next"

import { InventoryProvider } from "@/features/inventory/components/inventory-provider"
import { TechWorkWorkspace } from "@/features/field-work/components/tech-work-workspace"
import { inventorySeed } from "@/features/inventory/data/seed-data"
import { getCurrentOperator } from "@/features/auth/server/session"

export const metadata: Metadata = { title: "My Work" }

export default async function Page() {
  const operator = await getCurrentOperator()
  return (
    <InventoryProvider seed={inventorySeed} backend={operator ? "supabase" : "local"}>
      <TechWorkWorkspace />
    </InventoryProvider>
  )
}
