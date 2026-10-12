import { createReadStream } from "node:fs"

export async function readBoundedSource(file, maximumBytes = 40 * 1024 * 1024) {
  const chunks = []
  let bytes = 0
  for await (const chunk of createReadStream(file, { flags: "r", highWaterMark: 64 * 1024 })) {
    bytes += chunk.length
    if (bytes > maximumBytes) throw Object.assign(new Error("Source exceeds the bounded file limit"), { code: "SOURCE_SIZE_LIMIT" })
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, bytes)
}
