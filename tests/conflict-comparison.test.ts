// @vitest-environment node
import { expect, it } from "vitest"
import { conflictRecords } from "@/features/mobile/domain/conflict-comparison"

it("compares only referenced records and preserves their authoritative versions", () => {
  const snapshot = {
    revision: 20,
    lots: [{ id: "a", version: 5, quantity: 3 }, { id: "b", version: 9, quantity: 8 }],
    movements: [{ id: "movement-a", version: 2 }, { id: "movement-b", version: 4 }],
    projects: [{ id: "project", name: "Unrelated" }],
  }
  expect(conflictRecords(snapshot, ["a", "movement-a"])).toEqual({
    lots: [{ id: "a", version: 5, quantity: 3 }],
    movements: [{ id: "movement-a", version: 2 }],
  })
  expect(conflictRecords(snapshot, ["deleted"])).toEqual({})
})
