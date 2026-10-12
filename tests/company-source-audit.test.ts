// @vitest-environment node
import { afterEach, expect, it } from "vitest"
import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { auditSources, extractSources, summarizeAudit, validateLocations } from "../scripts/audit-company-sources.mjs"

const execute = promisify(execFile)
const temporaryDirectories: string[] = []
afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) {
    const resolved = path.resolve(directory)
    if (path.dirname(resolved) !== path.resolve(tmpdir()) || !path.basename(resolved).startsWith("tbs-source-audit-")) throw new Error("Unsafe fixture cleanup target")
    await fs.rm(resolved, { recursive: true, force: true })
  }
})

async function fixture() {
  const temporary = await fs.mkdtemp(path.join(tmpdir(), "tbs-source-audit-"))
  temporaryDirectories.push(temporary)
  const source = path.join(temporary, "source")
  const output = path.join(temporary, "private-audit")
  const files: Record<string, string> = {
    "1. Estimating/2025/old.txt": "excluded year",
    "1. Estimating/2026/estimate/source.txt": "Synthetic material; quantity unknown",
    "2. Projects/2026 Projects/job/quote.txt": "Job suffix remains text",
    "2. Projects/2027 Projects/next.txt": "Future year in scope",
    "2. Projects/00 Archive Projects/old.txt": "excluded archive",
    "root.xlsx.url": "[InternetShortcut]\nURL=https://example.invalid/source.xlsx",
    "~$root.xlsx": "synthetic Office lock",
  }
  for (const [relative, bytes] of Object.entries(files)) {
    const file = path.join(source, relative)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, bytes)
  }
  return { source, output, files }
}

it("inventories only year-scoped folders and root workbooks without following cloud links", async () => {
  const { source, output, files } = await fixture()
  const manifest = await auditSources({ source, output })
  expect(manifest.inventoryState).toBe("complete")
  expect(manifest.files.map((file: { sourceRelativePath: string }) => file.sourceRelativePath.replaceAll(path.sep, "/")).sort()).toEqual([
    "1. Estimating/2026/estimate/source.txt", "2. Projects/2026 Projects/job/quote.txt", "2. Projects/2027 Projects/next.txt", "root.xlsx.url",
  ])
  expect(summarizeAudit(manifest)).toMatchObject({ files: 4, rootFiles: 1, humanReviewComplete: false })
  for (const [relative, bytes] of Object.entries(files)) expect(await fs.readFile(path.join(source, relative), "utf8")).toBe(bytes)
})

it("refuses source-tree, enclosing-tree and Git-repository output before creating files", async () => {
  const { source, output } = await fixture()
  await expect(auditSources({ source, output: path.join(source, "audit") })).rejects.toThrow("separate")
  await expect(validateLocations(source, path.dirname(source))).rejects.toThrow("separate")
  await expect(fs.stat(path.join(source, "audit"))).rejects.toMatchObject({ code: "ENOENT" })
  const repo = path.join(path.dirname(output), "public-repo")
  await fs.mkdir(path.join(repo, ".git"), { recursive: true })
  await expect(validateLocations(source, path.join(repo, "private-data"))).rejects.toThrow("outside Git")
})

it("checkpoints a bounded scan and resumes without duplicate files or dropped directories", async () => {
  const { source, output } = await fixture()
  const partial = await auditSources({ source, output, maxDirectories: 1 })
  expect(partial.inventoryState).toBe("in-progress")
  expect(partial.pendingDirectories.length).toBeGreaterThan(0)
  const complete = await auditSources({ source, output, resume: true })
  expect(complete.inventoryState).toBe("complete")
  expect(new Set(complete.files.map((file: { sourceRelativePath: string }) => file.sourceRelativePath)).size).toBe(4)
  await expect(auditSources({ source, output, resume: true, since: 2027 })).rejects.toThrow("does not match")
  await expect(auditSources({ source, output })).rejects.toThrow("Existing audit")
})

it("extracts inert text into private artifacts with provenance, leaving review and sources unchanged", async () => {
  const { source, output, files } = await fixture()
  await auditSources({ source, output })
  const manifest = await extractSources({ source, output, limit: 2, rootOnly: true })
  const record = manifest.files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath === "root.xlsx.url")
  expect(record).toMatchObject({ extraction: "extracted", review: "pending-human-review" })
  expect(record.sha256).toMatch(/^[a-f0-9]{64}$/)
  const content = JSON.parse(await fs.readFile(path.join(output, record.extractedRelativePath), "utf8"))
  expect(content.text).toContain("https://example.invalid/source.xlsx")
  expect(await fs.readFile(path.join(source, "root.xlsx.url"), "utf8")).toBe(files["root.xlsx.url"])
  expect(manifest.files.filter((file: { extraction: string }) => file.extraction === "extracted")).toHaveLength(1)
})

it("records unsupported and oversized formats as exceptions rather than claiming to have read them", async () => {
  const { source, output } = await fixture()
  await fs.writeFile(path.join(source, "1. Estimating/2026/estimate/legacy.xls"), "synthetic unsupported XLS")
  await auditSources({ source, output })
  const manifest = await extractSources({ source, output, limit: 20, maxBytes: 25 })
  expect(manifest.files.find((file: { extension: string }) => file.extension === ".xls").extraction).toBe("unsupported-format")
  expect(manifest.files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath === "root.xlsx.url").extraction).toBe("size-limit")
})

it("recovers an extraction artifact left before its checkpoint without trusting partial output", async () => {
  const { source, output, files } = await fixture()
  await auditSources({ source, output })
  const id = createHash("sha256").update("root.xlsx.url").digest("hex")
  const extracted = path.join(output, "extracted")
  await fs.mkdir(extracted)
  await fs.writeFile(path.join(extracted, `${id}.json`), '{"kind":"text","text":"partial interrupted output"}')
  const manifest = await extractSources({ source, output, limit: 1, rootOnly: true })
  const record = manifest.files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath === "root.xlsx.url")
  expect(record).toMatchObject({ extraction: "extracted", review: "pending-human-review" })
  expect(record.sha256).toBe(createHash("sha256").update(files["root.xlsx.url"]).digest("hex"))
  const content = JSON.parse(await fs.readFile(path.join(output, record.extractedRelativePath), "utf8"))
  expect(content.text).toBe(files["root.xlsx.url"])
  expect(await fs.readFile(path.join(source, "root.xlsx.url"), "utf8")).toBe(files["root.xlsx.url"])
  expect((await fs.readdir(extracted)).filter(name => name.endsWith(".next.json"))).toEqual([])
})

it("bounds reads even when a source grows after its inventory metadata was captured", async () => {
  const { source, output } = await fixture()
  const text = path.join(source, "2. Projects/2027 Projects/next.txt")
  await auditSources({ source, output })
  await fs.writeFile(text, "x".repeat(200))
  const manifest = await extractSources({ source, output, limit: 20, maxBytes: 100 })
  expect(manifest.files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath.endsWith("next.txt"))).toMatchObject({ extraction: "size-limit", errorCode: "SOURCE_SIZE_LIMIT", review: "pending-human-review" })
  expect(await fs.readFile(text, "utf8")).toBe("x".repeat(200))
})

it("records a vanished source as unreadable and continues extracting later files", async () => {
  const { source, output } = await fixture()
  await auditSources({ source, output })
  await fs.unlink(path.join(source, "1. Estimating/2026/estimate/source.txt"))
  const manifest = await extractSources({ source, output, limit: 20 })
  const vanished = manifest.files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath.endsWith("source.txt"))
  expect(vanished).toMatchObject({ extraction: "read-error", errorCode: "ENOENT", review: "pending-human-review" })
  expect(manifest.files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath.endsWith("quote.txt"))).toMatchObject({ extraction: "extracted" })
  expect(manifest.files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath.endsWith("next.txt"))).toMatchObject({ extraction: "extracted" })
})

function syntheticPdf(text: string) {
  const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET` : ""
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = "%PDF-1.4\n"
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n ").join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return pdf
}

it("reads PDF text with hash provenance and flags empty-text pages for visual/OCR review", async () => {
  const { source, output } = await fixture()
  const pdf = path.join(source, "2. Projects/2026 Projects/job/quote.pdf")
  const blank = path.join(source, "2. Projects/2026 Projects/job/scanned.pdf")
  await fs.writeFile(pdf, syntheticPdf("Synthetic job 001.10"))
  await fs.writeFile(blank, syntheticPdf(""))
  const before = await fs.readFile(pdf)
  await auditSources({ source, output })
  const manifest = await extractSources({ source, output, limit: 20 })
  const files = manifest.files.filter((file: { extension: string }) => file.extension === ".pdf")
  expect(files).toHaveLength(2)
  expect(files.every((file: { extraction: string }) => file.extraction === "extracted")).toBe(true)
  const textFile = files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath.endsWith("quote.pdf"))
  const content = JSON.parse(await fs.readFile(path.join(output, textFile.extractedRelativePath), "utf8"))
  expect(content).toMatchObject({ kind: "pdf", pageCount: 1, truncated: false })
  expect(content.pages[0].text).toContain("Synthetic job 001.10")
  expect(textFile.requiresVisualOrOcrReview).toBe(false)
  expect(files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath.endsWith("scanned.pdf")).requiresVisualOrOcrReview).toBe(true)
  expect(await fs.readFile(pdf)).toEqual(before)
}, 30_000)

it.skipIf(process.platform !== "win32")("reads raw workbook strings and formulas without modifying or executing the workbook", async () => {
  const { source, output } = await fixture()
  const workbookName = "synthetic '$().xlsx"
  const workbook = path.join(source, workbookName)
  const createZip = `Add-Type -AssemblyName System.IO.Compression
$stream = [IO.File]::Open($args[0], [IO.FileMode]::CreateNew)
$zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
  $entries = @{
    'xl/workbook.xml' = '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Synthetic" state="hidden" r:id="r1" /></sheets></workbook>'
    'xl/_rels/workbook.xml.rels' = '<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml" /></Relationships>'
    'xl/sharedStrings.xml' = '<sst><si><t>001.10</t></si></sst>'
    'xl/worksheets/sheet1.xml' = '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><f>1+2</f><v>3</v></c><c r="C1" t="inlineStr"><is><t>Unknown</t></is></c></row></sheetData></worksheet>'
  }
  foreach ($name in $entries.Keys) {
    $writer = [IO.StreamWriter]::new($zip.CreateEntry($name).Open())
    try { $writer.Write($entries[$name]) } finally { $writer.Dispose() }
  }
} finally { $zip.Dispose(); $stream.Dispose() }`
  const fixtureCommand = createZip.replace("$args[0]", `'${workbook.replaceAll("'", "''")}'`)
  await execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(fixtureCommand, "utf16le").toString("base64")], { windowsHide: true })
  const before = await fs.readFile(workbook)
  await auditSources({ source, output })
  const manifest = await extractSources({ source, output, rootOnly: true, limit: 10 })
  const record = manifest.files.find((file: { sourceRelativePath: string }) => file.sourceRelativePath === workbookName)
  expect(record.extraction).toBe("extracted")
  const content = JSON.parse(await fs.readFile(path.join(output, record.extractedRelativePath), "utf8"))
  expect(content.sheets[0]).toMatchObject({ name: "Synthetic", state: "hidden" })
  expect(content.sheets[0].cells).toMatchObject([{ value: "001.10" }, { value: "3", formula: "1+2" }, { value: "Unknown" }])
  expect(await fs.readFile(workbook)).toEqual(before)
}, 30_000)
