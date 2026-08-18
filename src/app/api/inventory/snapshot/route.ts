import { NextResponse } from "next/server"

import { loadSupabaseInventorySnapshot } from "@/features/inventory/repositories/supabase-inventory-read-repository"
import { getCurrentOperator } from "@/features/auth/server/session"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const operator = await getCurrentOperator()
  if (!operator) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  }
  if (!operator.active) {
    return NextResponse.json({ error: "This account is not active." }, { status: 403 })
  }
  try {
    const snapshot = await loadSupabaseInventorySnapshot(await createClient())
    const response = operator.role === "Tech"
      ? {
          ...snapshot,
          aliases: [],
          photos: [],
          verifications: [],
          activities: [],
          issues: [],
          issueComments: [],
          issueTransitions: [],
          receipts: [],
          receiptLines: [],
          movements: [],
          movementLines: [],
        }
      : snapshot
    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    console.error("Inventory snapshot failed", error)
    return NextResponse.json(
      { error: "The shared Inventory workspace could not be loaded." },
      { status: 500 },
    )
  }
}
