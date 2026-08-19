import { NextResponse } from "next/server"

import { getCurrentOperator } from "@/features/auth/server/session"
import { fieldWorkSnapshotSchema } from "@/features/field-work/domain/field-work"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const operator = await getCurrentOperator()
  if (!operator) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  if (!operator.active) return NextResponse.json({ error: "This account is not active." }, { status: 403 })

  const { data, error } = await (await createClient()).rpc("get_field_work_snapshot_v1")
  if (error) {
    console.error("Field-work snapshot failed", error)
    return NextResponse.json({ error: "Assigned work could not be loaded." }, { status: 500 })
  }

  const snapshot = fieldWorkSnapshotSchema.safeParse(data)
  if (!snapshot.success) {
    console.error("Field-work snapshot was invalid", snapshot.error)
    return NextResponse.json({ error: "Assigned work returned an invalid response." }, { status: 500 })
  }
  return NextResponse.json(snapshot.data, { headers: { "Cache-Control": "private, no-store" } })
}
