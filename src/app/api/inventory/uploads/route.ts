import { createHash } from "node:crypto"

import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentOperator } from "@/features/auth/server/session"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const metadataSchema = z.object({
  commandId: z.string().uuid(),
  siteId: z.string().uuid(),
  uploadId: z.string().uuid(),
})
const rawMetadataSchema = metadataSchema.extend({ fileName: z.string().trim().min(1).max(255) })

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])

function safeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return normalized.slice(-120) || "photo"
}

export async function POST(request: Request) {
  const operator = await getCurrentOperator()
  if (!operator) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  if (!operator.active) return NextResponse.json({ error: "This account is not active." }, { status: 403 })
  let metadata: z.infer<typeof metadataSchema>
  let fileName: string
  let contentType: string
  let bytes: Buffer

  if (request.headers.get("x-tbs-queued-upload") === "1") {
    const url = new URL(request.url)
    const rawParsed = rawMetadataSchema.safeParse({
      commandId: url.searchParams.get("commandId"),
      siteId: url.searchParams.get("siteId"),
      uploadId: url.searchParams.get("uploadId"),
      fileName: url.searchParams.get("fileName"),
    })
    if (!rawParsed.success) return NextResponse.json({ error: "Queued upload metadata is invalid." }, { status: 400 })
    metadata = rawParsed.data
    fileName = rawParsed.data.fileName
    contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? ""
    bytes = Buffer.from(await request.arrayBuffer())
  } else {
    try {
      const form = await request.formData()
      const parsed = metadataSchema.safeParse({
        commandId: form.get("commandId"),
        siteId: form.get("siteId"),
        uploadId: form.get("uploadId"),
      })
      if (!parsed.success) return NextResponse.json({ error: "Upload metadata and an image are required." }, { status: 400 })
      metadata = parsed.data
      const file = form.get("file")
      if (!(file instanceof File)) return NextResponse.json({ error: "Upload metadata and an image are required." }, { status: 400 })
      fileName = file.name
      contentType = file.type
      bytes = Buffer.from(await file.arrayBuffer())
    } catch (cause) {
      console.error("Photo multipart body could not be parsed", cause)
      return NextResponse.json({ error: "The photo upload body could not be read." }, { status: 400 })
    }
  }

  if (!allowedTypes.has(contentType) || bytes.byteLength <= 0 || bytes.byteLength > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, HEIC, or HEIF image no larger than 15 MB." }, { status: 422 })
  }

  const checksum = createHash("sha256").update(bytes).digest("hex")
  const objectPath = `${metadata.siteId}/${operator.id}/${metadata.commandId}/${metadata.uploadId}-${safeFileName(fileName)}`
  const supabase = await createClient()

  const { error: stageError } = await supabase.from("staged_uploads").insert({
    id: metadata.uploadId,
    site_id: metadata.siteId,
    actor_user_id: operator.id,
    command_id: metadata.commandId,
    bucket_id: "operational-media",
    object_path: objectPath,
    content_type: contentType,
    size_bytes: bytes.byteLength,
    checksum_sha256: checksum,
  })
  if (stageError) return NextResponse.json({ error: stageError.message }, { status: 403 })

  const { error: uploadError } = await supabase.storage
    .from("operational-media")
    .upload(objectPath, bytes, { contentType, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 422 })

  return NextResponse.json({
    id: metadata.uploadId,
    fileName,
    objectPath,
    checksum,
  })
}
