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
const ticketSchema = metadataSchema.extend({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().toLowerCase(),
  size: z.number().int().positive().max(15 * 1024 * 1024),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
})

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])

function safeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return normalized.slice(-120) || "photo"
}

export async function POST(request: Request) {
  const operator = await getCurrentOperator()
  if (!operator) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  if (!operator.active) return NextResponse.json({ error: "This account is not active." }, { status: 403 })
  if (request.headers.get("x-tbs-queued-upload") === "ticket") {
    const parsed = ticketSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success || !allowedTypes.has(parsed.data.contentType)) {
      return NextResponse.json({ error: "Queued upload metadata is invalid." }, { status: 400 })
    }

    const input = parsed.data
    const fileName = safeFileName(input.fileName)
    const objectPath = `${input.siteId}/${operator.id}/${input.commandId}/${input.uploadId}-${fileName}`
    const supabase = await createClient()
    const { data: existing, error: lookupError } = await supabase
      .from("staged_uploads")
      .select("id,site_id,actor_user_id,command_id,object_path,content_type,size_bytes,checksum_sha256")
      .eq("id", input.uploadId)
      .maybeSingle()
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 403 })
    if (existing && (
      existing.site_id !== input.siteId ||
      existing.actor_user_id !== operator.id ||
      existing.command_id !== input.commandId ||
      existing.object_path !== objectPath ||
      existing.content_type !== input.contentType ||
      existing.size_bytes !== input.size ||
      existing.checksum_sha256 !== input.checksum
    )) {
      return NextResponse.json({ error: "This queued photo does not match its existing upload record." }, { status: 409 })
    }

    if (!existing) {
      const { error: stageError } = await supabase.from("staged_uploads").insert({
        id: input.uploadId,
        site_id: input.siteId,
        actor_user_id: operator.id,
        command_id: input.commandId,
        bucket_id: "operational-media",
        object_path: objectPath,
        content_type: input.contentType,
        size_bytes: input.size,
        checksum_sha256: input.checksum,
      })
      if (stageError) return NextResponse.json({ error: stageError.message }, { status: 403 })
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("operational-media")
      .createSignedUploadUrl(objectPath, { upsert: Boolean(existing) })
    if (signedError || !signed) return NextResponse.json({ error: signedError?.message ?? "A private upload ticket could not be created." }, { status: 403 })

    return NextResponse.json({
      id: input.uploadId,
      fileName,
      objectPath,
      token: signed.token,
      upsert: Boolean(existing),
    })
  }

  let metadata: z.infer<typeof metadataSchema>
  let fileName: string
  let contentType: string
  let bytes: Buffer
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
