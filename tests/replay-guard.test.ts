// @vitest-environment node
import { describe, expect, it } from "vitest"

import type { QueuedMutation, SyncConflict } from "@/features/mobile/domain/mobile-sync"
import { replayQueueDecision, requireReplaySession } from "@/features/mobile/domain/replay-guard"
import { buildQueuedMutation } from "@/features/mobile/services/mobile-sync-journal"

const siteId = "10000000-0000-4000-8000-000000000001"
const operatorId = "10000000-0000-4000-8000-000000000002"
const scope = `validation.supabase.co:${operatorId}`

function queued(overrides: Partial<QueuedMutation> = {}) {
  const { mutation } = buildQueuedMutation({
    scope,
    actor: { userId: operatorId, email: "operator@example.com", displayName: "Operator", role: "Operator" },
    siteId,
    commandType: "verification.confirm",
    entityIds: ["10000000-0000-4000-8000-000000000003"],
    entityBaseVersions: { "10000000-0000-4000-8000-000000000003": 7 },
    payload: { lotId: "10000000-0000-4000-8000-000000000003", expectedVersion: 7 },
  })
  return { ...mutation, ...overrides }
}

describe("queued replay guard", () => {
  it("locks queued work after an account or environment switch", () => {
    const mutation = queued()
    expect(() => replayQueueDecision(mutation, [mutation], [], "10000000-0000-4000-8000-000000000099", scope)).toThrow("another account")
    expect(() => replayQueueDecision(mutation, [mutation], [], operatorId, "another-environment")).toThrow("another account")
  })

  it("requires the current session to remain active for the original account", () => {
    expect(() => requireReplaySession(null, operatorId)).toThrow("Sign in again")
    expect(() => requireReplaySession("10000000-0000-4000-8000-000000000099", operatorId)).toThrow("Sign in again")
    expect(() => requireReplaySession(operatorId, operatorId)).not.toThrow()
  })

  it("keeps a conflict blocked and prevents its dependents from replaying", () => {
    const parent = queued()
    const child = queued({ dependsOn: [parent.id] })
    const conflict: SyncConflict = {
      id: "10000000-0000-4000-8000-000000000010",
      mutationId: parent.id,
      commandType: parent.commandType,
      entityId: parent.entityIds[0],
      title: "Shared record changed",
      localSummary: "Original physical count retained",
      serverSummary: "Current authorized record has a newer version",
      createdAt: "2026-09-17T12:00:00.000Z",
    }

    expect(replayQueueDecision(parent, [parent, child], [conflict], operatorId, scope)).toBe("conflict")
    expect(replayQueueDecision(child, [parent, child], [conflict], operatorId, scope)).toBe("dependency")
  })
})
