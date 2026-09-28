import { NextResponse } from "next/server"
import { getCurrentOperator } from "@/features/auth/server/session"

export async function GET() {
  const operator = await getCurrentOperator()
  const headers = { "Cache-Control": "private, no-store" }
  if (!operator?.active) return NextResponse.json({ error: "Sign in with an active account." }, { status: 401, headers })
  if (process.env.TBS_REPLAY_HOLD === "1") {
    return NextResponse.json({ error: "Queued replay is temporarily paused. Work remains on this device.", code: "REPLAY_PAUSED" }, { status: 423, headers })
  }
  return NextResponse.json({ userId: operator.id }, { headers })
}
