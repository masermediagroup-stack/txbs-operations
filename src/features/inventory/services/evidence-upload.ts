"use client"

import { evidenceSignatureMatches, validateEvidenceFile } from "@/features/inventory/domain/evidence-file"
import { sha256Hex } from "@/features/mobile/services/mobile-sync-transport"
import { getSupabaseEnvironment } from "@/lib/supabase/env"

export type EvidenceTransfer = { id: string; fileName: string; loaded: number; total: number; phase: "uploading" | "complete" | "failed" }
type UploadTicket = { id: string; fileName: string; uploaded?: boolean; signedUrl?: string; error?: string }

function progress(detail: EvidenceTransfer) {
  window.dispatchEvent(new CustomEvent("tbs-evidence-transfer", { detail }))
}

function uploadBytes(url: string, bytes: ArrayBuffer, type: string, report: (loaded: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", url)
    request.timeout = 120_000
    request.setRequestHeader("Content-Type", type)
    request.setRequestHeader("x-upsert", "false")
    request.upload.onprogress = (event) => report(event.loaded)
    request.onerror = () => reject(new Error("Photo transfer interrupted. Retrying preserves the original upload identity."))
    request.ontimeout = () => reject(new Error("Photo transfer timed out."))
    request.onabort = () => reject(new Error("Photo transfer was interrupted."))
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Photo storage returned HTTP ${request.status}.`))
    request.send(bytes)
  })
}

export async function uploadEvidence(input: { commandId: string; siteId: string; uploadId?: string; file: Blob; fileName: string; actorId?: string }) {
  const id = input.uploadId ?? crypto.randomUUID()
  validateEvidenceFile(input.file.size, input.file.type)
  const bytes = await input.file.arrayBuffer()
  if (!evidenceSignatureMatches(new Uint8Array(bytes), input.file.type)) throw new Error("The photo contents do not match its image type. Choose the original image file.")
  const checksum = await sha256Hex(bytes)
  const report = (loaded: number, phase: EvidenceTransfer["phase"] = "uploading") => progress({ id, fileName: input.fileName, loaded, total: bytes.byteLength, phase })
  report(0)
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch("/api/inventory/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-TBS-Queued-Upload": "ticket", ...(input.actorId ? { "X-TBS-Actor": input.actorId } : {}) },
        body: JSON.stringify({ commandId: input.commandId, siteId: input.siteId, uploadId: id, fileName: input.fileName, contentType: input.file.type, size: bytes.byteLength, checksum }),
      })
      const ticket = await response.json() as UploadTicket
      if (!response.ok) throw new Error(ticket.error ?? "A photo upload ticket could not be created.")
      if (ticket.id !== id || !ticket.fileName) throw new Error("The photo upload ticket does not match this evidence.")
      if (ticket.uploaded) { report(bytes.byteLength, "complete"); return { id, fileName: ticket.fileName } }
      const url = new URL(ticket.signedUrl ?? "")
      if (url.origin !== new URL(getSupabaseEnvironment().url).origin || !url.pathname.startsWith("/storage/v1/object/upload/sign/operational-media/")) throw new Error("The photo upload destination is invalid.")
      try {
        await uploadBytes(url.href, bytes, input.file.type, (loaded) => report(loaded))
        report(bytes.byteLength, "complete")
        return { id, fileName: ticket.fileName }
      } catch (cause) {
        if (attempt === 2 || !navigator.onLine) throw cause
        // A lost response may have followed a successful upload. Reissue the same
        // ticket identity so the server verifies existing bytes before another PUT.
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt))
      }
    }
    throw new Error("Photo could not be uploaded.")
  } catch (cause) {
    report(0, "failed")
    throw cause
  }
}
