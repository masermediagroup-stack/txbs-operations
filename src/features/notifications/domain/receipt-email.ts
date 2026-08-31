import { z } from "zod"

export const receiptNotificationClaimSchema = z.object({
  receipt: z.object({
    id: z.string().uuid(),
    receiptNumber: z.string().nullable(),
    projectName: z.string().nullable(),
    handwrittenProjectText: z.string(),
    siteName: z.string(),
    inspectionState: z.string(),
    operatorName: z.string(),
    completedAt: z.string(),
    lines: z.array(z.object({
      materialName: z.string(),
      packageType: z.string(),
      quantity: z.number().int().nullable(),
      condition: z.string(),
      locationName: z.string().nullable(),
    })),
  }),
  deliveries: z.array(z.object({
    id: z.string().uuid(),
    recipientName: z.string(),
    recipientEmail: z.string().email(),
  })),
})

export type ReceiptNotificationClaim = z.infer<typeof receiptNotificationClaimSchema>
type Receipt = ReceiptNotificationClaim["receipt"]

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character)
}

function identity(receipt: Receipt) {
  return receipt.projectName || receipt.handwrittenProjectText || "Unknown shipment"
}

export function buildReceiptNotificationEmail(receipt: Receipt, appUrl: string) {
  const project = identity(receipt)
  const completedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(new Date(receipt.completedAt))
  const receiptNumber = receipt.receiptNumber || "Not provided"
  const lines = receipt.lines.map((line) => ({
    ...line,
    quantityLabel: line.quantity === null ? "Unknown" : `${line.quantity} ${line.packageType}`,
  }))
  const rows = lines.map((line) => `<tr>
    <td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(line.materialName)}</td>
    <td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(line.quantityLabel)}</td>
    <td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(line.condition)}</td>
    <td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(line.locationName || "Not assigned")}</td>
  </tr>`).join("")
  const receivingUrl = new URL("/inventory/receiving", appUrl).toString()

  return {
    subject: `[TBS Receiving] ${project} received at ${receipt.siteName}`,
    html: `<div style="font-family:Arial,sans-serif;color:#10242f;max-width:680px;margin:auto">
      <div style="border-bottom:3px solid #f36f21;padding-bottom:16px">
        <h1 style="font-size:24px;margin:0 0 6px">Material received</h1>
        <p style="color:#5c6971;margin:0">${escapeHtml(project)} · ${escapeHtml(receipt.siteName)}</p>
      </div>
      <table style="border-collapse:collapse;width:100%;margin:20px 0"><tbody>
        <tr><td style="padding:5px 0;color:#5c6971">Receipt</td><td style="padding:5px 0;font-weight:600">${escapeHtml(receiptNumber)}</td></tr>
        <tr><td style="padding:5px 0;color:#5c6971">Inspection</td><td style="padding:5px 0;font-weight:600">${escapeHtml(receipt.inspectionState)}</td></tr>
        <tr><td style="padding:5px 0;color:#5c6971">Received by</td><td style="padding:5px 0;font-weight:600">${escapeHtml(receipt.operatorName)}</td></tr>
        <tr><td style="padding:5px 0;color:#5c6971">Completed</td><td style="padding:5px 0;font-weight:600">${escapeHtml(completedAt)} CT</td></tr>
      </tbody></table>
      <h2 style="font-size:18px">Material</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <thead><tr style="text-align:left;background:#f3f5f6"><th style="padding:10px">Item</th><th style="padding:10px">Quantity</th><th style="padding:10px">Condition</th><th style="padding:10px">Storage</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px"><a href="${escapeHtml(receivingUrl)}" style="background:#005a73;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open Receiving</a></p>
      <p style="font-size:12px;color:#6b7280">This operational notification contains no private photo attachments. Sign in to TBS Operations to review private evidence.</p>
    </div>`,
    text: [
      "Material received",
      `${project} · ${receipt.siteName}`,
      `Receipt: ${receiptNumber}`,
      `Inspection: ${receipt.inspectionState}`,
      `Received by: ${receipt.operatorName}`,
      `Completed: ${completedAt} CT`,
      "",
      ...lines.map((line) => `${line.materialName} — ${line.quantityLabel} — ${line.condition} — ${line.locationName || "Not assigned"}`),
      "",
      `Open Receiving: ${receivingUrl}`,
    ].join("\n"),
  }
}
