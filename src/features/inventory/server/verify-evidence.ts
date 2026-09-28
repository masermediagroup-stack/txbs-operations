import "server-only"
import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { evidenceSignatureMatches } from "@/features/inventory/domain/evidence-file"

/** Only the trusted server can attest bytes; direct client RPCs cannot bypass this. */
export async function verifyCommandEvidence(commandId: string, actorId: string) {
  const supabase = await createClient()
  const { data: uploads, error } = await supabase.from("staged_uploads").select("id,bucket_id,object_path,content_type,size_bytes,checksum_sha256,consumed_at")
    .eq("command_id", commandId).eq("actor_user_id", actorId)
  if (error) throw new Error("Could not check staged evidence.")
  if (!uploads?.some((upload) => !upload.consumed_at)) return
  const admin = createAdminClient()
  for (const upload of uploads) {
    if (upload.consumed_at) continue
    const { data: blob, error: downloadError } = await supabase.storage.from(upload.bucket_id).download(upload.object_path)
    if (downloadError || !blob) throw new Error("A photo has not finished uploading. Retry once the upload completes.")
    const bytes = Buffer.from(await blob.arrayBuffer())
    const checksum = createHash("sha256").update(bytes).digest("hex")
    if (bytes.length !== upload.size_bytes || checksum !== upload.checksum_sha256 || blob.type.split(";")[0] !== upload.content_type || !evidenceSignatureMatches(bytes, upload.content_type)) {
      throw new Error("Uploaded evidence differs from the selected file. Retain the original and upload it again.")
    }
    const { error: verificationError } = await admin.rpc("verify_staged_upload", { p_upload_id: upload.id, p_actor_id: actorId, p_checksum: checksum, p_size: bytes.length })
    if (verificationError) throw new Error("Evidence could not be verified. Retain the original and retry.")
  }
}
