import "server-only"

import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/supabase/database.types"
import { getSupabaseEnvironment } from "@/lib/supabase/env"

/** Creates a server-only client for narrowly scoped privileged operations. */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!secret) {
    throw new Error("Supabase server credentials are not configured.")
  }

  return createClient<Database>(getSupabaseEnvironment().url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
