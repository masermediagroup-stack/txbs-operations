// @vitest-environment node
import "fake-indexeddb/auto"
import { describe, expect, it } from "vitest"

import { assessLegacyRecovery, type LegacyRecoveryCandidate } from "@/features/mobile/domain/legacy-recovery"
import { IndexedDbMobileSyncPersistence } from "@/features/mobile/repositories/mobile-sync-persistence"
import { hasLegacyDeviceData } from "@/features/mobile/repositories/scoped-database"

const actorUserId = "10000000-0000-4000-8000-000000000001"
const commandId = "10000000-0000-4000-8000-000000000002"
const lotId = "10000000-0000-4000-8000-000000000003"
const environment = "validation.supabase.co"

function candidate(overrides: Partial<LegacyRecoveryCandidate> = {}): LegacyRecoveryCandidate {
  return {
    sourceDatabase: "tbs-operations-mobile",
    actorUserId,
    environment,
    clientMutationId: commandId,
    expectedVersions: { [lotId]: 4 },
    evidenceRequired: true,
    evidence: [{ id: "photo-1", checksumSha256: "a".repeat(64), sizeBytes: 128, attribution: "exact" }],
    commandReceipt: null,
    archive: { encrypted: true, approvedStorageReference: "company-vault://legacy/device-1" },
    ...overrides,
  }
}

function createLegacyDatabase(name: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore("work")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

describe("legacy recovery quarantine", () => {
  it("detects legacy databases without adopting or deleting their records", async () => {
    const legacy = await createLegacyDatabase("tbs-operations-mobile")
    const write = legacy.transaction("work", "readwrite")
    write.objectStore("work").put({ commandId, actorUserId, environment }, "preserved-command")
    await new Promise<void>((resolve, reject) => {
      write.oncomplete = () => resolve()
      write.onerror = write.onabort = () => reject(write.error)
    })

    expect(await hasLegacyDeviceData()).toBe(true)
    const current = new IndexedDbMobileSyncPersistence(`${environment}:${actorUserId}`)
    expect(await current.listMutations()).toEqual([])
    expect(await current.listPhotos()).toEqual([])
    await current.clear()

    const read = legacy.transaction("work", "readonly")
    expect(await requestResult(read.objectStore("work").get("preserved-command"))).toEqual({ commandId, actorUserId, environment })
    legacy.close()
  })

  it("allows only fully attributed, encrypted fixtures into manual recovery review", () => {
    expect(assessLegacyRecovery(candidate())).toEqual({
      decision: "eligible-for-manual-recovery",
      reasons: ["Verified for explicit administrator review; automatic adoption remains unavailable."],
    })
  })

  it("treats a matching command receipt as already recorded instead of replaying it", () => {
    expect(assessLegacyRecovery(candidate({ commandReceipt: { commandId, actorUserId, environment } }))).toEqual({
      decision: "already-recorded",
      reasons: ["The authoritative command receipt already records this action; do not replay it."],
    })
  })

  it("keeps missing ownership, mismatched receipts, ambiguous evidence and unencrypted archives quarantined", () => {
    const assessment = assessLegacyRecovery(candidate({
      actorUserId: null,
      environment: null,
      expectedVersions: null,
      evidence: [{ id: "photo-1", checksumSha256: null, sizeBytes: null, attribution: "ambiguous" }],
      commandReceipt: { commandId, actorUserId, environment },
      archive: { encrypted: false, approvedStorageReference: null },
    }))
    expect(assessment.decision).toBe("quarantined")
    expect(assessment.reasons).toEqual(expect.arrayContaining([
      "Original actor identity is missing or invalid.",
      "Original environment attribution is missing.",
      "Expected record versions are missing or ambiguous.",
      "Evidence attribution, checksum, or size is ambiguous.",
      "An encrypted archive in approved company storage is required.",
      "The authoritative command receipt does not match the preserved actor and environment.",
    ]))
  })
})
