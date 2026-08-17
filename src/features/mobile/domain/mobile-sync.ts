import { z } from "zod"

export const MOBILE_SYNC_DATABASE_VERSION = 1 as const
export const MOBILE_COMMAND_VERSION = 1 as const

export const mobileCommandTypes = [
  "material.add",
  "verification.confirm",
  "receipt.save-draft",
  "receipt.complete",
  "movement.create",
  "movement.reverse",
  "issue.record",
  "issue.assign",
  "issue.comment",
  "issue.transition",
  "outbound.plan",
  "outbound.ready",
  "outbound.depart",
  "outbound.cancel",
  "outbound.reverse",
] as const

export const queuedMutationStates = ["pending", "syncing", "blocked"] as const
export const queuedPhotoStates = ["pending", "uploading", "blocked"] as const

export type MobileCommandType = (typeof mobileCommandTypes)[number]
export type QueuedMutationState = (typeof queuedMutationStates)[number]
export type QueuedPhotoState = (typeof queuedPhotoStates)[number]

export type QueuedActor = {
  userId: string | null
  email: string | null
  displayName: string
  role: "Operator" | "Tech" | null
}

export type QueuedMutation = {
  id: string
  clientMutationId: string
  commandType: MobileCommandType
  commandVersion: typeof MOBILE_COMMAND_VERSION
  siteId: string
  actor: QueuedActor
  createdAt: string
  updatedAt: string
  entityIds: string[]
  entityBaseVersions: Record<string, number>
  payload: Record<string, unknown>
  photoIds: string[]
  retryCount: number
  state: QueuedMutationState
  lastError: string | null
}

export type QueuedPhoto = {
  id: string
  mutationId: string
  fieldPath: string
  fileName: string
  contentType: string
  size: number
  createdAt: string
  state: QueuedPhotoState
  retryCount: number
  lastError: string | null
  blob: Blob
}

export type SyncConflict = {
  id: string
  mutationId: string
  commandType: MobileCommandType
  entityId: string | null
  title: string
  localSummary: string
  serverSummary: string
  createdAt: string
}

export type MobileCacheManifest = {
  schemaVersion: typeof MOBILE_SYNC_DATABASE_VERSION
  preparedAt: string
  userId: string | null
  siteIds: string[]
  inventoryRevision: number
}

const actorSchema: z.ZodType<QueuedActor> = z.object({
  userId: z.string().uuid().nullable(),
  email: z.string().email().nullable(),
  displayName: z.string().trim().min(1),
  role: z.enum(["Operator", "Tech"]).nullable(),
})

export const queuedMutationSchema: z.ZodType<QueuedMutation> = z.object({
  id: z.string().uuid(),
  clientMutationId: z.string().uuid(),
  commandType: z.enum(mobileCommandTypes),
  commandVersion: z.literal(MOBILE_COMMAND_VERSION),
  siteId: z.string().uuid(),
  actor: actorSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  entityIds: z.array(z.string().uuid()),
  entityBaseVersions: z.record(z.string().uuid(), z.number().int().positive()),
  payload: z.record(z.string(), z.unknown()),
  photoIds: z.array(z.string().uuid()),
  retryCount: z.number().int().nonnegative(),
  state: z.enum(queuedMutationStates),
  lastError: z.string().nullable(),
})

export const syncConflictSchema: z.ZodType<SyncConflict> = z.object({
  id: z.string().uuid(),
  mutationId: z.string().uuid(),
  commandType: z.enum(mobileCommandTypes),
  entityId: z.string().uuid().nullable(),
  title: z.string().min(1),
  localSummary: z.string().min(1),
  serverSummary: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
})

export type QueueMutationInput = {
  clientMutationId?: string
  commandType: MobileCommandType
  siteId: string
  actor: QueuedActor
  entityIds?: string[]
  entityBaseVersions?: Record<string, number>
  payload: Record<string, unknown>
}

export type JournalExport = {
  format: "tbs-mobile-journal"
  schemaVersion: typeof MOBILE_SYNC_DATABASE_VERSION
  exportedAt: string
  mutations: QueuedMutation[]
  photos: Array<Omit<QueuedPhoto, "blob"> & { base64: string }>
  conflicts: SyncConflict[]
  manifest: MobileCacheManifest | null
}
