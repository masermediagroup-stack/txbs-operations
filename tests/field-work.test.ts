import { describe, expect, it } from "vitest"

import { parseFieldWorkCommand } from "@/features/field-work/domain/field-work"

const assignmentId = "11111111-1111-4111-8111-111111111111"
const siteId = "22222222-2222-4222-8222-222222222222"
const lineId = "33333333-3333-4333-8333-333333333333"

function confirmation(photoUploads: Array<{ id: string; fileName: string }> = [], issueType: "Damaged" | "Missing" | null = null) {
  return {
    commandId: "44444444-4444-4444-8444-444444444444",
    commandType: "field.installation.confirm",
    siteId,
    payload: {
      assignmentId,
      expectedVersion: 2,
      outcome: "Partially installed",
      notes: "Two packages remain.",
      lines: [{ outboundLineId: lineId, installedQuantity: 3 }],
      photoUploads,
      issue: issueType ? { type: issueType, priority: "High", title: `${issueType} material`, description: "Field evidence" } : null,
    },
  }
}

describe("field-work commands", () => {
  it("requires photo evidence for a damaged field Issue", () => {
    expect(() => parseFieldWorkCommand(confirmation([], "Damaged"))).toThrow(/photo/i)
  })

  it("allows non-damage field Issues without a photo", () => {
    expect(parseFieldWorkCommand(confirmation([], "Missing")).commandType).toBe("field.installation.confirm")
  })

  it("accepts at most three installation photos", () => {
    const uploads = [1, 2, 3].map((value) => ({ id: `${value}${value}${value}${value}${value}${value}${value}${value}-${value}${value}${value}${value}-4${value}${value}${value}-8${value}${value}${value}-${value}${value}${value}${value}${value}${value}${value}${value}${value}${value}${value}${value}`, fileName: `${value}.jpg` }))
    expect(parseFieldWorkCommand(confirmation(uploads, "Damaged")).commandType).toBe("field.installation.confirm")
  })
})
