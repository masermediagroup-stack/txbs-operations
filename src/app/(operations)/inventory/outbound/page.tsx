import type { Metadata } from "next"
import { Suspense } from "react"

import { OutboundWorkspace } from "@/features/inventory/components/outbound-workspace"

export const metadata: Metadata = { title: "Outbound material" }

export default function Page() {
  return <Suspense fallback={null}><OutboundWorkspace /></Suspense>
}

