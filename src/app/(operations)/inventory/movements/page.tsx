import type { Metadata } from "next"
import { Suspense } from "react"

import { MovementWorkspace } from "@/features/inventory/components/movement-workspace"

export const metadata: Metadata = { title: "Material movements" }

export default function Page() {
  return <Suspense fallback={null}><MovementWorkspace /></Suspense>
}
