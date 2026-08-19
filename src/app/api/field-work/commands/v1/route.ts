import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { getCurrentOperator } from "@/features/auth/server/session"
import { parseFieldWorkCommand } from "@/features/field-work/domain/field-work"
import type { Json } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const operator = await getCurrentOperator()
  if (!operator) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  if (!operator.active) return NextResponse.json({ error: "This account is not active." }, { status: 403 })

  try {
    const command = parseFieldWorkCommand(await request.json())
    const { data, error } = await (await createClient()).rpc("execute_field_work_command_v1", {
      p_command_id: command.commandId,
      p_command_type: command.commandType,
      p_site_id: command.siteId,
      p_payload: command.payload as Json,
    })
    if (error) {
      const status = error.code === "40001" || error.code === "23505" ? 409
        : error.code === "P0002" ? 404
          : error.code === "42501" ? 403
            : error.code === "23514" ? 422
              : error.code === "0A000" ? 501 : 500
      return NextResponse.json({ error: error.message, code: error.code }, {
        status,
        headers: { "Cache-Control": "private, no-store" },
      })
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "The field-work command was not valid.", issues: error.issues }, { status: 400 })
    }
    console.error("Field-work command failed", error)
    return NextResponse.json({ error: "The field-work command could not be completed." }, { status: 500 })
  }
}
