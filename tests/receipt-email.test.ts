import { describe, expect, it } from "vitest"

import { buildReceiptNotificationEmail } from "@/features/notifications/domain/receipt-email"

const receipt = {
  id: "11111111-1111-4111-8111-111111111111",
  receiptNumber: "REC-104",
  projectName: "Plano & West",
  handwrittenProjectText: "",
  siteName: "Lavon Yard",
  inspectionState: "Accepted",
  operatorName: "Tyler Vea",
  completedAt: "2026-08-31T15:00:00.000Z",
  lines: [{
    materialName: "Mirror <12 ft>",
    packageType: "Crate",
    quantity: null,
    condition: "Good",
    locationName: "Conex 8",
  }],
}

describe("receiving email", () => {
  it("describes the completed receipt without inventing unknown quantity", () => {
    const email = buildReceiptNotificationEmail(receipt, "https://tbs.example.com")

    expect(email.subject).toBe("[TBS Receiving] Plano & West received at Lavon Yard")
    expect(email.text).toContain("Mirror <12 ft> — Unknown — Good — Conex 8")
    expect(email.text).toContain("https://tbs.example.com/inventory/receiving")
  })

  it("escapes operational text in the HTML message", () => {
    const email = buildReceiptNotificationEmail(receipt, "https://tbs.example.com")

    expect(email.html).toContain("Plano &amp; West")
    expect(email.html).toContain("Mirror &lt;12 ft&gt;")
    expect(email.html).not.toContain("Mirror <12 ft>")
  })
})
