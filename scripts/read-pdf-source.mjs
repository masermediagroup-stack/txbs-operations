import { readBoundedSource } from "./bounded-source-file.mjs"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

const source = process.argv[2]
if (!source) throw new Error("A source PDF path is required")
const bytes = await readBoundedSource(source)
const task = getDocument({
  data: new Uint8Array(bytes),
  isEvalSupported: false,
  enableXfa: false,
  disableFontFace: true,
  useSystemFonts: true,
  verbosity: 0,
})
try {
  const document = await task.promise
  const pages = []
  let characters = 0
  let truncated = false
  for (let number = 1; number <= Math.min(document.numPages, 300); number++) {
    const page = await document.getPage(number)
    const content = await page.getTextContent()
    let text = ""
    for (const item of content.items) {
      if (!("str" in item)) continue
      if (characters + item.str.length + 1 > 2_000_000) { truncated = true; break }
      text += item.str + (item.hasEOL ? "\n" : " ")
      characters += item.str.length + 1
    }
    pages.push({ number, text: text.trim(), needsVisualOrOcrReview: !text.trim() })
    page.cleanup()
    if (truncated) break
  }
  truncated ||= document.numPages > pages.length
  console.log(JSON.stringify({
    kind: "pdf", pageCount: document.numPages, pages, truncated,
    warnings: ["Text extraction does not establish reading order, table structure, drawing meaning, or image/OCR coverage.", "Empty-text pages require visual review or OCR; references and embedded scripts are not executed."],
  }))
} finally {
  await task.destroy()
}
