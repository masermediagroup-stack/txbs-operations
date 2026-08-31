"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getCurrentOperator } from "@/features/auth/server/session"
import { dispatchReceiptNotifications } from "@/features/notifications/server/receipt-notifications"
import { createClient } from "@/lib/supabase/server"

const recipientSchema = z.object({
  id: z.union([z.string().uuid(), z.literal("")]).optional(),
  displayName: z.string().trim().min(1),
  email: z.string().trim().email(),
  active: z.string().optional(),
})

export async function saveReceivingNotificationRecipientAction(formData: FormData) {
  const operator = await getCurrentOperator()
  if (!operator || operator.role !== "Operator") redirect("/administration?notificationError=forbidden")

  const parsed = recipientSchema.safeParse({
    id: formData.get("id") ?? undefined,
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    active: formData.get("active") ?? undefined,
  })
  if (!parsed.success) redirect("/administration?notificationError=invalid-recipient")

  const { error } = await (await createClient()).rpc("admin_upsert_receiving_notification_recipient_v1", {
    p_id: parsed.data.id || null,
    p_display_name: parsed.data.displayName,
    p_email: parsed.data.email,
    p_active: parsed.data.active === "on",
  })
  if (error) redirect(`/administration?notificationError=${encodeURIComponent(error.message)}`)
  revalidatePath("/administration")
  redirect("/administration?notificationSaved=1")
}

export async function retryReceiptNotificationAction(formData: FormData) {
  const operator = await getCurrentOperator()
  if (!operator || operator.role !== "Operator") redirect("/administration?notificationError=forbidden")
  const parsed = z.string().uuid().safeParse(formData.get("receiptId"))
  if (!parsed.success) redirect("/administration?notificationError=invalid-receipt")

  let sent: number
  try {
    const result = await dispatchReceiptNotifications(await createClient(), parsed.data)
    sent = result.sent
  } catch (error) {
    const message = error instanceof Error ? error.message : "Notification retry failed."
    redirect(`/administration?notificationError=${encodeURIComponent(message)}`)
  }
  revalidatePath("/administration")
  redirect(`/administration?notificationRetried=${sent}`)
}
