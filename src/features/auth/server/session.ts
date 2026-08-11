import "server-only"

import { cache } from "react"

import { hasSupabaseEnvironment } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export type CurrentOperator = {
  id: string
  email: string
  displayName: string
  role: "Operator" | "Manager" | "Administrator"
  active: boolean
}

export const getCurrentOperator = cache(async (): Promise<CurrentOperator | null> => {
  if (!hasSupabaseEnvironment()) return null

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,display_name,system_role,active")
    .eq("id", userId)
    .maybeSingle()

  if (!profile) return null
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.system_role,
    active: profile.active,
  } as CurrentOperator
})

