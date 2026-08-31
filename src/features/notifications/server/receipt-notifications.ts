import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { Resend } from "resend"

import { buildReceiptNotificationEmail, receiptNotificationClaimSchema } from "@/features/notifications/domain/receipt-email"
import type { Database } from "@/lib/supabase/database.types"

export async function dispatchReceiptNotifications(
  supabase: SupabaseClient<Database>,
  receiptId: string,
) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return { sent: 0, failed: 0, configured: false }

  const { data, error } = await supabase.rpc("claim_receipt_notifications_v1", {
    p_receipt_id: receiptId,
  })
  if (error) throw error

  const claim = receiptNotificationClaimSchema.parse(data)
  if (!claim.deliveries.length) return { sent: 0, failed: 0, configured: true }

  const resend = new Resend(apiKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const message = buildReceiptNotificationEmail(claim.receipt, appUrl)
  let sent = 0
  let failed = 0

  for (const delivery of claim.deliveries) {
    const { data: response, error: sendError } = await resend.emails.send({
      from,
      to: [delivery.recipientEmail],
      replyTo: process.env.RESEND_REPLY_TO || undefined,
      ...message,
    }, { idempotencyKey: `receipt-received/${claim.receipt.id}/${delivery.id}` })

    const status = sendError ? "Failed" : "Sent"
    const { error: finishError } = await supabase.rpc("finish_receipt_notification_v1", {
      p_delivery_id: delivery.id,
      p_status: status,
      p_provider_message_id: response?.id ?? null,
      p_error: sendError?.message ?? null,
    })
    if (finishError) throw finishError
    if (sendError) failed += 1
    else sent += 1
  }

  return { sent, failed, configured: true }
}
