"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getCurrentOperator } from "@/features/auth/server/session"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().min(1),
  role: z.enum(["Operator", "Tech"]),
  active: z.string().optional(),
})

export async function configureProfileAction(formData: FormData) {
  const operator = await getCurrentOperator()
  if (!operator || operator.role !== "Operator") redirect("/administration?error=forbidden")

  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    active: formData.get("active") ?? undefined,
  })
  if (!parsed.success) redirect("/administration?error=invalid-input")

  const { error } = await (await createClient()).rpc("admin_configure_profile_v1", {
    p_user_id: parsed.data.userId,
    p_display_name: parsed.data.displayName,
    p_active: parsed.data.active === "on",
    p_role: parsed.data.role,
    p_site_id: null,
  })
  if (error) redirect(`/administration?error=${encodeURIComponent(error.message)}`)
  revalidatePath("/administration")
  redirect("/administration?saved=1")
}
