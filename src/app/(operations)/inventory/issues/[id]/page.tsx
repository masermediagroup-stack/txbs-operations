import type { Metadata } from "next"

import { IssueWorkspace } from "@/features/inventory/components/issue-workspace"

export const metadata: Metadata = { title: "Inventory Issue" }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <IssueWorkspace issueId={id} />
}
