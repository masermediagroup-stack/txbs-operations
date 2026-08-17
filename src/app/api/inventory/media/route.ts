import { NextResponse } from "next/server"

import { getCurrentOperator } from "@/features/auth/server/session"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const operator = await getCurrentOperator()
  if (!operator) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  if (!operator.active) return NextResponse.json({ error: "This account is not active." }, { status: 403 })
  if (operator.role !== "Operator") return NextResponse.json({ error: "Operator access is required." }, { status: 403 })

  const path = new URL(request.url).searchParams.get("path")?.trim()
  if (!path) return NextResponse.json({ error: "A media path is required." }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase.storage.from("operational-media").download(path)
  if (error || !data) return NextResponse.json({ error: "Photo not found." }, { status: 404 })

  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  })
}
