"use client"

import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseEnvironment } from "@/lib/supabase/env"
import type { Database } from "@/lib/supabase/database.types"

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseEnvironment()
    browserClient = createBrowserClient<Database>(url, publishableKey)
  }

  return browserClient
}
