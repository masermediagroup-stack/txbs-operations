import { NextResponse } from "next/server"

import { getCurrentOperator } from "@/features/auth/server/session"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const operator = await getCurrentOperator()
  if (!operator) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  if (!operator.active) return NextResponse.json({ error: "This account is not active." }, { status: 403 })

  const path = new URL(request.url).searchParams.get("path")?.trim()
  if (!path) return NextResponse.json({ error: "A media path is required." }, { status: 400 })

  const supabase = await createClient()
  // The caller's Storage RLS authorizes the object; only a short-lived URL crosses the function.
  const { data, error } = await supabase.storage.from("operational-media").createSignedUrl(path, 60)
  if (error || !data) return NextResponse.json({ error: "Photo not found." }, { status: 404 })

  const response = NextResponse.redirect(data.signedUrl, 307)
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}
