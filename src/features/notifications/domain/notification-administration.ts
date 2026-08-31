import { z } from "zod"

export const notificationAdministrationSchema = z.object({
  recipients: z.array(z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    email: z.string().email(),
    active: z.boolean(),
    updatedAt: z.string(),
  })),
  deliveries: z.array(z.object({
    id: z.string().uuid(),
    receiptId: z.string().uuid(),
    receiptNumber: z.string().nullable(),
    recipientName: z.string(),
    recipientEmail: z.string().email(),
    status: z.string(),
    attemptCount: z.number().int(),
    lastError: z.string().nullable(),
    createdAt: z.string(),
    sentAt: z.string().nullable(),
  })),
})

export type NotificationAdministration = z.infer<typeof notificationAdministrationSchema>
