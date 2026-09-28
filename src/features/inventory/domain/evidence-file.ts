export const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024
export const EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])

export function validateEvidenceFile(size: number, type: string) {
  if (!EVIDENCE_TYPES.has(type) || size <= 0 || size > MAX_EVIDENCE_BYTES) throw new Error("Use a JPEG, PNG, WebP, HEIC, or HEIF image no larger than 15 MiB.")
}

export function evidenceSignatureMatches(bytes: Uint8Array, type: string) {
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end))
  if (type === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (type === "image/png") return [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)
  if (type === "image/webp") return text(0,4) === "RIFF" && text(8,12) === "WEBP"
  if (type === "image/heic" || type === "image/heif") {
    if (bytes.length < 16 || text(4,8) !== "ftyp") return false
    const brands = new Set(["heic", "heix", "hevc", "hevx", "mif1", "msf1"])
    const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0)
    if (boxSize < 16 || boxSize > bytes.length) return false
    if (brands.has(text(8,12))) return true
    for (let offset = 16; offset + 4 <= boxSize; offset += 4) if (brands.has(text(offset,offset+4))) return true
  }
  return false
}
