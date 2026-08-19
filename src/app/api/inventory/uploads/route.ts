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

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])

function safeFileName(name: string) {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return normalized.slice(-120) || "photo"
}

export async function POST(request: Request) {
  const operator = await getCurrentOperator()
  if (!operator) return NextResponse.json({ error: "Authentication is required." }, { status: 401 })
  if (!operator.active) return NextResponse.json({ error: "This account is not active." }, { status: 403 })
  const form = await request.formData()
  const parsed = metadataSchema.safeParse({
    commandId: form.get("commandId"),
    siteId: form.get("siteId"),
    uploadId: form.get("uploadId"),
  })
  const file = form.get("file")
  if (!parsed.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Upload metadata and an image are required." }, { status: 400 })
  }
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, HEIC, or HEIF image no larger than 15 MB." }, { status: 422 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const checksum = createHash("sha256").update(bytes).digest("hex")
  const objectPath = `${parsed.data.siteId}/${operator.id}/${parsed.data.commandId}/${parsed.data.uploadId}-${safeFileName(file.name)}`
  const supabase = await createClient()

  const { error: stageError } = await supabase.from("staged_uploads").insert({
    id: parsed.data.uploadId,
    site_id: parsed.data.siteId,
    actor_user_id: operator.id,
    command_id: parsed.data.commandId,
    bucket_id: "operational-media",
    object_path: objectPath,
    content_type: file.type,
    size_bytes: file.size,
    checksum_sha256: checksum,
  })
  if (stageError) return NextResponse.json({ error: stageError.message }, { status: 403 })

  const { error: uploadError } = await supabase.storage
    .from("operational-media")
    .upload(objectPath, bytes, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 422 })

  return NextResponse.json({
    id: parsed.data.uploadId,
    fileName: file.name,
    objectPath,
    checksum,
  })
}
