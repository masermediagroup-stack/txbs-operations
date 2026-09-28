import { z } from "zod"

export const LEGACY_DATABASE_NAMES = ["tbs-operations-inventory", "tbs-operations-mobile"] as const

type LegacyDatabaseName = (typeof LEGACY_DATABASE_NAMES)[number]

export type LegacyRecoveryCandidate = {
  sourceDatabase: LegacyDatabaseName
  actorUserId: string | null
  environment: string | null
  clientMutationId: string | null
  expectedVersions: Record<string, number> | null
  evidenceRequired: boolean
  evidence: Array<{
    id: string
    checksumSha256: string | null
    sizeBytes: number | null
    attribution: "exact" | "ambiguous"
  }>
  commandReceipt: {
    commandId: string
    actorUserId: string
    environment: string
  } | null
  archive: {
    encrypted: boolean
    approvedStorageReference: string | null
  }
}

export type LegacyRecoveryAssessment = {
  decision: "eligible-for-manual-recovery" | "already-recorded" | "quarantined"
  reasons: string[]
}

const uuid = z.string().uuid()
const sha256 = /^[a-f0-9]{64}$/

/** Classify preserved legacy work without importing, mutating, or assigning new identities. */
export function assessLegacyRecovery(candidate: LegacyRecoveryCandidate): LegacyRecoveryAssessment {
  const reasons: string[] = []
  if (!candidate.actorUserId || !uuid.safeParse(candidate.actorUserId).success) reasons.push("Original actor identity is missing or invalid.")
  if (!candidate.environment?.trim()) reasons.push("Original environment attribution is missing.")
  if (!candidate.clientMutationId || !uuid.safeParse(candidate.clientMutationId).success) reasons.push("Original command identity is missing or invalid.")
  if (!candidate.expectedVersions || Object.keys(candidate.expectedVersions).length === 0
    || Object.entries(candidate.expectedVersions).some(([id, version]) => !uuid.safeParse(id).success || !Number.isInteger(version) || version < 1)) {
    reasons.push("Expected record versions are missing or ambiguous.")
  }
  if (candidate.evidenceRequired && candidate.evidence.length === 0) reasons.push("Required evidence is missing.")
  if (candidate.evidence.some((item) => item.attribution !== "exact" || !item.checksumSha256 || !sha256.test(item.checksumSha256) || !Number.isInteger(item.sizeBytes) || (item.sizeBytes ?? 0) < 1)) {
    reasons.push("Evidence attribution, checksum, or size is ambiguous.")
  }
  if (!candidate.archive.encrypted || !candidate.archive.approvedStorageReference?.trim()) {
    reasons.push("An encrypted archive in approved company storage is required.")
  }

  if (candidate.commandReceipt) {
    const receiptMatches = candidate.commandReceipt.commandId === candidate.clientMutationId
      && candidate.commandReceipt.actorUserId === candidate.actorUserId
      && candidate.commandReceipt.environment === candidate.environment
    if (receiptMatches && reasons.length === 0) return { decision: "already-recorded", reasons: ["The authoritative command receipt already records this action; do not replay it."] }
    reasons.push("The authoritative command receipt does not match the preserved actor and environment.")
  }

  return reasons.length
    ? { decision: "quarantined", reasons }
    : { decision: "eligible-for-manual-recovery", reasons: ["Verified for explicit administrator review; automatic adoption remains unavailable."] }
}
