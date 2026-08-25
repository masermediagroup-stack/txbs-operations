import type { MobileCommandType, QueuedPhoto } from "@/features/mobile/domain/mobile-sync"

export type UploadedQueuedPhoto = {
  id: string
  fileName: string
}

function safeQueuedFileName(value: string) {
  const normalized = value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return normalized.slice(-120) || "queued-photo"
}

export function sameOriginApiUrl(path: string, currentUrl: string) {
  return new URL(path, currentUrl).href
}

export function queuedPhotoFormData(photo: QueuedPhoto, commandId: string, siteId: string) {
  const form = new FormData()
  form.set("commandId", commandId)
  form.set("siteId", siteId)
  form.set("uploadId", photo.id)

  // WebKit can reject a File reconstructed from a Blob read back from IndexedDB.
  // Appending the persisted Blob with an explicit safe filename produces the same
  // multipart File on the server without using the fragile client-side constructor.
  const blob = photo.blob.type === photo.contentType
    ? photo.blob
    : new Blob([photo.blob], { type: photo.contentType })
  form.append("file", blob, safeQueuedFileName(photo.fileName))
  return form
}

function restorePhotos(value: unknown, uploadById: ReadonlyMap<string, UploadedQueuedPhoto>): unknown {
  if (Array.isArray(value)) return value.map((item) => restorePhotos(item, uploadById))
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (typeof record.queuedPhotoId === "string") return uploadById.get(record.queuedPhotoId) ?? null
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, restorePhotos(item, uploadById)]))
  }
  return value
}

function uploadedPhotos(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is UploadedQueuedPhoto => Boolean(
    item && typeof item === "object" && typeof (item as UploadedQueuedPhoto).id === "string" && typeof (item as UploadedQueuedPhoto).fileName === "string",
  ))
}

function uploadedPhoto(value: unknown) {
  return uploadedPhotos(value ? [value] : [])[0] ?? null
}

function withEvidenceMetadata(
  uploads: UploadedQueuedPhoto[],
  photoType: unknown,
  caption: unknown,
) {
  return uploads.map((upload) => ({
    ...upload,
    ...(typeof photoType === "string" ? { photoType } : {}),
    ...(typeof caption === "string" ? { caption } : {}),
  }))
}

export function prepareQueuedCommandPayload(
  commandType: MobileCommandType,
  serializedPayload: Record<string, unknown>,
  uploadById: ReadonlyMap<string, UploadedQueuedPhoto>,
) {
  const payload = restorePhotos(serializedPayload, uploadById) as Record<string, unknown>
  const many = withEvidenceMetadata(
    [...uploadedPhotos(payload.files), ...uploadedPhotos(payload.file ? [payload.file] : [])],
    payload.photoType,
    payload.caption ?? payload.note,
  )

  if (commandType === "movement.create") return { ...payload, photoUploads: many }
  if (["material.add", "verification.confirm", "issue.record", "issue.comment", "outbound.depart"].includes(commandType)) {
    return { ...payload, photoUpload: many[0] ?? null }
  }
  if (commandType === "receipt.save-draft") {
    const documentUploads = withEvidenceMetadata(
      [...uploadedPhotos(payload.documentFiles), ...uploadedPhotos(payload.documentFile ? [payload.documentFile] : [])],
      "Document",
      "Receiving document",
    )
    const labelUpload = uploadedPhoto(payload.labelFile)
    const lines = Array.isArray(payload.lines)
      ? payload.lines.map((line) => {
        if (!line || typeof line !== "object") return line
        const record = line as Record<string, unknown>
        return {
          ...record,
          photoUploads: withEvidenceMetadata(
            [...uploadedPhotos(record.files), ...uploadedPhotos(record.file ? [record.file] : [])],
            record.photoType ?? "Material",
            record.caption ?? record.materialName,
          ),
        }
      })
      : payload.lines
    return {
      ...payload,
      documentUploads,
      labelUpload: labelUpload ? { ...labelUpload, photoType: "Label", caption: payload.handwrittenProjectText } : null,
      lines,
    }
  }
  return payload
}
