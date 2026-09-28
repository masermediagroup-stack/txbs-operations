// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest"
import { uploadEvidence } from "@/features/inventory/services/evidence-upload"
import { evidenceSignatureMatches, validateEvidenceFile } from "@/features/inventory/domain/evidence-file"

vi.mock("@/lib/supabase/env", () => ({ getSupabaseEnvironment: () => ({ url: "https://validation.supabase.co" }) }))
afterEach(() => vi.unstubAllGlobals())

function png(size = 6 * 1024 * 1024) {
  const bytes = new Uint8Array(size)
  bytes.set([137,80,78,71,13,10,26,10])
  return new Blob([bytes], { type: "image/png" })
}

function setup(interrupted = false) {
  const requests: Array<{ url: string; body: ArrayBuffer }> = []
  vi.stubGlobal("window", new EventTarget())
  vi.stubGlobal("navigator", { onLine: true })
  vi.stubGlobal("XMLHttpRequest", class {
    upload: { onprogress?: (event: { loaded: number }) => void } = {}
    url = ""
    status = 200
    onload?: () => void
    onerror?: () => void
    open(_method: string, url: string) { this.url = url }
    setRequestHeader() {}
    send(body: ArrayBuffer) {
      requests.push({ url: this.url, body })
      this.upload.onprogress?.({ loaded: body.byteLength })
      queueMicrotask(() => interrupted ? this.onerror?.() : this.onload?.())
    }
  })
  return requests
}

it("sends a photo above the function limit directly to Storage using only a small API ticket", async () => {
  const sent = setup()
  const fetcher = vi.fn(async (_url, init: RequestInit) => {
    const metadata = JSON.parse(init.body as string)
    expect((init.body as string).length).toBeLessThan(1024)
    expect(metadata.size).toBe(6 * 1024 * 1024)
    expect(metadata.checksum).toMatch(/^[a-f0-9]{64}$/)
    return Response.json({ id: metadata.uploadId, fileName: "large.png", signedUrl: "https://validation.supabase.co/storage/v1/object/upload/sign/operational-media/large.png?token=test" })
  })
  vi.stubGlobal("fetch", fetcher)
  await uploadEvidence({ commandId: crypto.randomUUID(), siteId: crypto.randomUUID(), file: png(), fileName: "large.png" })
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(sent).toHaveLength(1)
  expect(sent[0].body.byteLength).toBe(6 * 1024 * 1024)
  expect(sent[0].url).toContain("https://validation.supabase.co/")
})

it("reconciles an interrupted response under the same upload identity without overwriting existing bytes", async () => {
  const sent = setup(true)
  const ids: string[] = []
  vi.stubGlobal("fetch", vi.fn(async (_url, init: RequestInit) => {
    const metadata = JSON.parse(init.body as string)
    ids.push(metadata.uploadId)
    return Response.json({ id: metadata.uploadId, fileName: "large.png", uploaded: ids.length > 1, signedUrl: "https://validation.supabase.co/storage/v1/object/upload/sign/operational-media/large.png?token=test" })
  }))
  await uploadEvidence({ commandId: crypto.randomUUID(), siteId: crypto.randomUUID(), file: png(), fileName: "large.png" })
  expect(ids).toHaveLength(2)
  expect(new Set(ids).size).toBe(1)
  expect(sent).toHaveLength(1)
})

it("rejects oversized files and content that does not match its claimed image type", async () => {
  expect(() => validateEvidenceFile(16 * 1024 * 1024, "image/png")).toThrow()
  expect(evidenceSignatureMatches(new TextEncoder().encode("<html>fake photo</html>"), "image/png")).toBe(false)
  expect(evidenceSignatureMatches(new Uint8Array([255,216,255]), "image/jpeg")).toBe(true)
  await expect(uploadEvidence({ commandId: crypto.randomUUID(), siteId: crypto.randomUUID(), file: new Blob(["fake"], { type: "image/png" }), fileName: "fake.png" })).rejects.toThrow("contents")
})
