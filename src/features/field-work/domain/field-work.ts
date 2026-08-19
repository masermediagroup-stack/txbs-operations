import { z } from "zod"

export const fieldAssignmentStatuses = ["Not Started", "In Progress", "Blocked", "Completed", "Cancelled"] as const
export const installationOutcomes = ["Installed", "Partially installed", "Blocked"] as const
export const fieldIssueTypes = ["Damaged", "Missing", "Wrong project", "Blocked access"] as const

const uuid = z.string().uuid()
const nullableDate = z.string().datetime({ offset: true }).nullable()

export const fieldAssignmentSchema = z.object({
  id: uuid,
  siteId: uuid,
  projectId: uuid,
  outboundBatchId: uuid.nullable(),
  assignedTechId: uuid,
  assignedTechName: z.string().min(1),
  status: z.enum(fieldAssignmentStatuses),
  dueAt: nullableDate,
  note: z.string(),
  assignedByUserId: uuid,
  assignedByName: z.string().min(1),
  assignedAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  cancelledAt: nullableDate,
  version: z.number().int().positive(),
})

export const fieldAssignmentEventSchema = z.object({
  id: uuid,
  assignmentId: uuid,
  eventType: z.string().min(1),
  fromStatus: z.enum(fieldAssignmentStatuses).nullable(),
  toStatus: z.enum(fieldAssignmentStatuses),
  note: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
  actorUserId: uuid,
  actorName: z.string().min(1),
})

export const installationConfirmationSchema = z.object({
  id: uuid,
  assignmentId: uuid,
  siteId: uuid,
  projectId: uuid,
  techUserId: uuid,
  techName: z.string().min(1),
  outcome: z.enum(installationOutcomes),
  notes: z.string(),
  confirmedAt: z.string().datetime({ offset: true }),
  commandId: uuid,
})

export const installationLineSchema = z.object({
  id: uuid,
  confirmationId: uuid,
  outboundLineId: uuid.nullable(),
  materialName: z.string().min(1),
  deliveredQuantity: z.number().int().positive().nullable(),
  installedQuantity: z.number().int().nonnegative(),
  remainingQuantity: z.number().int().nonnegative().nullable(),
})

export const fieldWorkSnapshotSchema = z.object({
  assignments: z.array(fieldAssignmentSchema),
  events: z.array(fieldAssignmentEventSchema),
  confirmations: z.array(installationConfirmationSchema),
  lines: z.array(installationLineSchema),
  installationPhotos: z.array(z.object({ confirmationId: uuid, photoId: uuid })),
  techs: z.array(z.object({ id: uuid, displayName: z.string().min(1), email: z.string().email() })),
})

const stagedPhotoSchema = z.object({
  id: uuid,
  fileName: z.string().min(1),
  photoType: z.literal("Material").optional(),
  caption: z.string().optional(),
})

const installationCommandSchema = z.object({
  assignmentId: uuid,
  expectedVersion: z.number().int().positive(),
  outcome: z.enum(installationOutcomes),
  notes: z.string(),
  lines: z.array(z.object({ outboundLineId: uuid, installedQuantity: z.number().int().nonnegative() })).min(1),
  photoUploads: z.array(stagedPhotoSchema).max(3),
  issue: z.object({
    type: z.enum(fieldIssueTypes),
    priority: z.enum(["Normal", "High", "Urgent"]),
    title: z.string().trim().min(1),
    description: z.string(),
  }).nullable(),
}).superRefine((value, context) => {
  if (value.issue?.type === "Damaged" && value.photoUploads.length === 0) {
    context.addIssue({ code: "custom", path: ["photoUploads"], message: "Damaged field Issues require at least one photo." })
  }
})

const fieldCommandSchemas = {
  "field.assignment.create": z.object({
    outboundBatchId: uuid,
    techUserId: uuid,
    dueAt: z.string().datetime({ offset: true }).nullable(),
    note: z.string(),
  }),
  "field.assignment.start": z.object({ assignmentId: uuid, expectedVersion: z.number().int().positive() }),
  "field.assignment.cancel": z.object({ assignmentId: uuid, expectedVersion: z.number().int().positive(), note: z.string().trim().min(1) }),
  "field.assignment.reassign": z.object({ assignmentId: uuid, expectedVersion: z.number().int().positive(), techUserId: uuid }),
  "field.installation.confirm": installationCommandSchema,
} as const

export type FieldWorkCommandType = keyof typeof fieldCommandSchemas
export type FieldAssignment = z.infer<typeof fieldAssignmentSchema>
export type FieldWorkSnapshot = z.infer<typeof fieldWorkSnapshotSchema>
export type InstallationOutcome = typeof installationOutcomes[number]

const commandEnvelopeSchema = z.object({
  commandId: uuid,
  commandType: z.enum(Object.keys(fieldCommandSchemas) as [FieldWorkCommandType, ...FieldWorkCommandType[]]),
  siteId: uuid,
  payload: z.unknown(),
})

export function parseFieldWorkCommand(value: unknown) {
  const command = commandEnvelopeSchema.parse(value)
  return { ...command, payload: fieldCommandSchemas[command.commandType].parse(command.payload) }
}
