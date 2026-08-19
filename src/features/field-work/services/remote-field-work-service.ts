"use client"

import { fieldWorkSnapshotSchema, type FieldWorkCommandType } from "@/features/field-work/domain/field-work"

type CommandResult = {
  entityId?: string
  assignmentId?: string
  confirmationId?: string
  issueId?: string | null
  version?: number
  duplicate?: boolean
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(body.error ?? "The assigned-work request failed.")
  return body
}

export async function loadFieldWorkSnapshot() {
  const response = await fetch("/api/field-work/snapshot", { cache: "no-store" })
  return fieldWorkSnapshotSchema.parse(await responseJson<unknown>(response))
}

export async function executeFieldWorkCommand(
  commandId: string,
  commandType: FieldWorkCommandType,
  siteId: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch("/api/field-work/commands/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commandId, commandType, siteId, payload }),
  })
  return responseJson<CommandResult>(response)
}

export async function stageFieldPhotos(commandId: string, siteId: string, files: File[], caption: string) {
  const selected = files.filter((file) => file.size > 0)
  if (selected.length > 3) throw new Error("Select no more than 3 photos.")
  return Promise.all(selected.map(async (file) => {
    const uploadId = crypto.randomUUID()
    const form = new FormData()
    form.set("commandId", commandId)
    form.set("siteId", siteId)
    form.set("uploadId", uploadId)
    form.set("file", file)
    const response = await fetch("/api/inventory/uploads", { method: "POST", body: form })
    const uploaded = await responseJson<{ id: string; fileName: string }>(response)
    return { id: uploaded.id, fileName: uploaded.fileName, photoType: "Material" as const, caption }
  }))
}
