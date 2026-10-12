import { createHash, randomUUID } from "node:crypto"
import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { readBoundedSource } from "./bounded-source-file.mjs"

const execute = promisify(execFile)
const officeExtensions = new Set([".xlsx", ".xlsm", ".docx", ".pptx"])
const textExtensions = new Set([".txt", ".csv", ".tsv", ".md", ".json", ".xml", ".url"])
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate)
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
}

async function canonicalDestination(candidate) {
  let existing = path.resolve(candidate)
  const missing = []
  for (;;) {
    try {
      return path.join(await fs.realpath(existing), ...missing.reverse())
    } catch (error) {
      if (error.code !== "ENOENT") throw error
      const parent = path.dirname(existing)
      if (parent === existing) throw error
      missing.push(path.basename(existing))
      existing = parent
    }
  }
}

async function insideRepository(candidate) {
  let current = candidate
  for (;;) {
    try {
      await fs.lstat(path.join(current, ".git"))
      return true
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error
    }
    const parent = path.dirname(current)
    if (parent === current) return false
    current = parent
  }
}

export async function validateLocations(source, output) {
  const sourcePath = await fs.realpath(path.resolve(source))
  const outputPath = await canonicalDestination(output)
  if (isWithin(sourcePath, outputPath) || isWithin(outputPath, sourcePath)) {
    throw new Error("Audit output must be separate from the read-only source tree")
  }
  if (process.platform === "win32") {
    const localDrive = `${process.env.SystemDrive || "C:"}${path.sep}`.toLowerCase()
    if (!outputPath.toLowerCase().startsWith(localDrive) || outputPath.startsWith("\\\\")) {
      throw new Error("Audit output must use the local system drive, not a network/mapped drive")
    }
  }
  if (await insideRepository(outputPath)) {
    throw new Error("Company audit output must be outside Git repositories")
  }
  return { sourcePath, outputPath }
}

async function discoverScope(sourcePath, since) {
  const roots = []
  const rootFiles = []
  const excluded = []
  const errors = []
  const entries = await fs.readdir(sourcePath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile()) {
      if (!entry.name.startsWith("~$") && (entry.name.toLowerCase().endsWith(".xlsx") || entry.name.toLowerCase().endsWith(".xlsx.url"))) {
        rootFiles.push(path.join(sourcePath, entry.name))
      } else if (entry.name.startsWith("~$")) {
        excluded.push(entry.name)
      }
    }
  }
  for (const group of ["1. Estimating", "2. Projects"]) {
    const parent = path.join(sourcePath, group)
    try {
      for (const entry of await fs.readdir(parent, { withFileTypes: true })) {
        const match = entry.name.match(/^(\d{4})(?: Projects)?$/)
        if (entry.isDirectory() && match && Number(match[1]) >= since) roots.push(path.join(parent, entry.name))
        else excluded.push(path.relative(sourcePath, path.join(parent, entry.name)))
      }
    } catch (error) {
      errors.push({ path: path.relative(sourcePath, parent), operation: "discover-scope", code: error.code || "ERROR" })
    }
  }
  return { roots: roots.sort(), rootFiles: rootFiles.sort(), excluded: excluded.sort(), errors }
}

async function saveManifest(outputPath, manifest) {
  const destination = path.join(outputPath, "manifest.json")
  const temporary = path.join(outputPath, `manifest-${randomUUID()}.next.json`)
  manifest.checkpointAt = new Date().toISOString()
  await fs.writeFile(temporary, JSON.stringify(manifest, null, 2), { mode: 0o600, flag: "wx" })
  await fs.rename(temporary, destination)
}

async function describeFile(sourcePath, filePath) {
  const stat = await fs.stat(filePath)
  return {
    sourceRelativePath: path.relative(sourcePath, filePath),
    extension: path.extname(filePath).toLowerCase(),
    bytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    extraction: path.basename(filePath).startsWith("~$") ? "temporary-office-file" : "not-read",
    review: "pending-human-review",
  }
}

async function describeFiles(sourcePath, paths, errors) {
  const files = []
  let next = 0
  await Promise.all(Array.from({ length: Math.min(8, paths.length) }, async () => {
    while (next < paths.length) {
      const file = paths[next++]
      try { files.push(await describeFile(sourcePath, file)) }
      catch (error) { errors.push({ path: path.relative(sourcePath, file), operation: "stat", code: error.code || "ERROR" }) }
    }
  }))
  return files.sort((a, b) => a.sourceRelativePath.localeCompare(b.sourceRelativePath))
}

export async function auditSources({ source, output, since = 2026, resume = false, maxDirectories = Infinity, onProgress = () => {}, shouldStop = () => false }) {
  if (!Number.isInteger(since) || since < 2000 || since > 9999) throw new Error("since must be a four-digit year")
  if (!(maxDirectories > 0)) throw new Error("maxDirectories must be positive")
  const { sourcePath, outputPath } = await validateLocations(source, output)
  let manifest
  try {
    manifest = JSON.parse(await fs.readFile(path.join(outputPath, "manifest.json"), "utf8"))
    if (!resume) throw new Error("Existing audit: use --resume or a new output directory")
    if (manifest.schemaVersion !== 1 || manifest.sourcePath !== sourcePath || manifest.since !== since) {
      throw new Error("Resume configuration does not match the original audit")
    }
    const rootLocks = manifest.files.filter(record => path.dirname(record.sourceRelativePath) === "." && path.basename(record.sourceRelativePath).startsWith("~$"))
    manifest.files = manifest.files.filter(record => !rootLocks.includes(record))
    manifest.excludedRoots = [...new Set([...manifest.excludedRoots, ...rootLocks.map(record => record.sourceRelativePath)])].sort()
    manifest.rootFileCount = manifest.files.filter(record => path.dirname(record.sourceRelativePath) === ".").length
    for (const relative of manifest.pendingDirectories) {
      if (!isWithin(sourcePath, path.resolve(sourcePath, relative))) throw new Error("Invalid checkpoint directory")
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    const scope = await discoverScope(sourcePath, since)
    manifest = {
      schemaVersion: 1, sourcePath, since, startedAt: new Date().toISOString(),
      inventoryState: "in-progress", scopeRoots: scope.roots.map(root => path.relative(sourcePath, root)),
      excludedRoots: scope.excluded, rootFileCount: scope.rootFiles.length,
      pendingDirectories: scope.roots.map(root => path.relative(sourcePath, root)),
      visitedDirectories: [], files: [], errors: scope.errors,
      limitations: ["Directory enumeration is not a point-in-time server snapshot", "Extraction does not establish human review or verified physical stock", "Cloud links are recorded without opening their targets", "No business records are created or source files modified"],
    }
    for (const file of scope.rootFiles) {
      try { manifest.files.push(await describeFile(sourcePath, file)) }
      catch (error) { manifest.errors.push({ path: path.relative(sourcePath, file), operation: "stat", code: error.code || "ERROR" }) }
    }
  }
  await fs.mkdir(outputPath, { recursive: true })
  // Complete one directory before checkpointing; interruption never drops a pending directory.
  let processed = 0
  while (manifest.pendingDirectories.length && processed < maxDirectories && !shouldStop()) {
    const relative = manifest.pendingDirectories[0]
    const directory = path.join(sourcePath, relative)
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true })
      const realDirectory = await fs.realpath(directory)
      if (!isWithin(sourcePath, realDirectory)) throw Object.assign(new Error("Source link escapes scope"), { code: "LINK_OUTSIDE_SCOPE" })
      const children = []
      const paths = []
      for (const entry of entries) {
        const child = path.join(directory, entry.name)
        if (entry.isSymbolicLink()) {
          manifest.errors.push({ path: path.relative(sourcePath, child), operation: "skip-link", code: "LINK_NOT_FOLLOWED" })
        } else if (entry.isDirectory()) children.push(path.relative(sourcePath, child))
        else if (entry.isFile()) paths.push(child)
      }
      manifest.files.push(...await describeFiles(sourcePath, paths, manifest.errors))
      manifest.pendingDirectories.push(...children.sort())
      manifest.visitedDirectories.push(relative)
    } catch (error) {
      manifest.errors.push({ path: relative, operation: "enumerate-directory", code: error.code || "ERROR" })
    }
    manifest.pendingDirectories.shift()
    processed++
    if (processed % 10 === 0) {
      await saveManifest(outputPath, manifest)
      onProgress({ directories: manifest.visitedDirectories.length, files: manifest.files.length, pending: manifest.pendingDirectories.length })
    }
  }
  manifest.inventoryState = manifest.pendingDirectories.length ? "in-progress" : manifest.errors.length ? "complete-with-exceptions" : "complete"
  await saveManifest(outputPath, manifest)
  return manifest
}

export async function extractSources({ source, output, limit = 10, rootOnly = false, maxBytes = 40 * 1024 * 1024 }) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error("Extraction limit must be a positive integer")
  const { sourcePath, outputPath } = await validateLocations(source, output)
  const manifest = JSON.parse(await fs.readFile(path.join(outputPath, "manifest.json"), "utf8"))
  if (manifest.schemaVersion !== 1 || manifest.sourcePath !== sourcePath) throw new Error("Extraction source does not match the audit")
  const extractedPath = path.join(outputPath, "extracted")
  if (await canonicalDestination(extractedPath) !== extractedPath) throw new Error("Extraction output cannot be redirected through a link")
  await fs.mkdir(extractedPath, { recursive: true })
  let attempted = 0
  for (const record of manifest.files) {
    if (record.extraction === "unsupported-format" && record.extension === ".pdf") record.extraction = "not-read"
    if (record.extraction === "read-error" && record.errorCode === "EEXIST") record.extraction = "not-read"
    if (record.extraction !== "not-read" || (rootOnly && path.dirname(record.sourceRelativePath) !== ".")) continue
    if (attempted >= limit) break
    const file = path.resolve(sourcePath, record.sourceRelativePath)
    if (!isWithin(sourcePath, file)) throw new Error("Invalid checkpoint file")
    if (record.bytes > maxBytes) { record.extraction = "size-limit"; continue }
    if (!officeExtensions.has(record.extension) && !textExtensions.has(record.extension) && record.extension !== ".pdf") { record.extraction = "unsupported-format"; continue }
    attempted++
    const id = createHash("sha256").update(record.sourceRelativePath).digest("hex")
    const destination = path.join(extractedPath, `${id}.json`)
    const staged = path.join(extractedPath, `${id}-${randomUUID()}.next.json`)
    try {
      if (!isWithin(sourcePath, await fs.realpath(file))) throw Object.assign(new Error("Source link escapes scope"), { code: "LINK_OUTSIDE_SCOPE" })
      const before = await fs.stat(file)
      const bytes = await readBoundedSource(file, maxBytes)
      const checksum = createHash("sha256").update(bytes).digest("hex")
      if (officeExtensions.has(record.extension)) {
        if (process.platform !== "win32") { record.extraction = "reader-unavailable"; continue }
        const reader = await fs.readFile(path.join(scriptDirectory, "read-office-source.ps1"), "utf8")
        // Use reviewed inline commands; no machine execution-policy change is required.
        const command = `& {\n${reader}\n} -SourcePath '${file.replaceAll("'", "''")}'`
        const result = await execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(command, "utf16le").toString("base64")], { windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 120_000 })
        const parsed = JSON.parse(result.stdout.replace(/^\uFEFF/, ""))
        await fs.writeFile(staged, JSON.stringify(parsed, null, 2), { mode: 0o600, flag: "wx" })
      } else if (record.extension === ".pdf") {
        const result = await execute(process.execPath, [path.join(scriptDirectory, "read-pdf-source.mjs"), file], { windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 120_000 })
        const parsed = JSON.parse(result.stdout)
        await fs.writeFile(staged, JSON.stringify(parsed, null, 2), { mode: 0o600, flag: "wx" })
        record.requiresVisualOrOcrReview = parsed.pages.some(page => page.needsVisualOrOcrReview)
        record.truncated = parsed.truncated
      } else {
        let text = bytes.toString("utf8")
        if (bytes[0] === 0xff && bytes[1] === 0xfe) text = bytes.subarray(2).toString("utf16le")
        await fs.writeFile(staged, JSON.stringify({ kind: "text", text, warning: "References, commands, formulas, and links are inert source text" }, null, 2), { mode: 0o600, flag: "wx" })
      }
      const after = await fs.stat(file)
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || createHash("sha256").update(await readBoundedSource(file, maxBytes)).digest("hex") !== checksum) {
        record.extraction = "source-changed-during-read"
        continue
      }
      // Re-extract from verified source bytes before replacing an orphan left by
      // interruption before its checkpoint. Completed manifest records are skipped.
      await fs.rename(staged, destination)
      delete record.errorCode
      record.sha256 = checksum
      record.bytes = before.size
      record.modifiedAt = before.mtime.toISOString()
      record.extraction = record.truncated ? "partial-extraction" : "extracted"
      record.extractedRelativePath = path.relative(outputPath, destination)
      record.extractedAt = new Date().toISOString()
    } catch (error) {
      record.extraction = error.code === "SOURCE_SIZE_LIMIT" ? "size-limit" : "read-error"
      record.errorCode = error.code || "READER_ERROR"
    } finally {
      await fs.unlink(staged).catch(error => { if (error.code !== "ENOENT") throw error })
    }
    await saveManifest(outputPath, manifest)
  }
  await saveManifest(outputPath, manifest)
  return manifest
}

export function summarizeAudit(manifest) {
  const extensions = {}, extraction = {}
  for (const file of manifest.files) {
    extensions[file.extension || "(none)"] = (extensions[file.extension || "(none)"] || 0) + 1
    extraction[file.extraction] = (extraction[file.extraction] || 0) + 1
  }
  return { inventoryState: manifest.inventoryState, rootFiles: manifest.rootFileCount, directories: manifest.visitedDirectories.length, pendingDirectories: manifest.pendingDirectories.length, files: manifest.files.length, exceptions: manifest.errors.length, extensions, extraction, humanReviewComplete: false }
}

async function main() {
  const args = process.argv.slice(2)
  const options = {}
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (["--resume", "--extract-root"].includes(argument)) options[argument] = true
    else if (["--source", "--output", "--since", "--max-directories", "--extract-limit"].includes(argument)) {
      if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Missing value for ${argument}`)
      options[argument] = args[++index]
    } else throw new Error(`Unknown option ${argument}`)
  }
  if (!options["--source"] || !options["--output"]) throw new Error("Usage: node scripts/audit-company-sources.mjs --source <TBS folder> --output <private local folder outside Git> [--resume] [--since 2026] [--max-directories 50] [--extract-root | --extract-limit 10]")
  let stopping = false
  process.on("SIGINT", () => { stopping = true })
  const config = { source: options["--source"], output: options["--output"] }
  let manifest = await auditSources({ ...config, since: Number(options["--since"] || 2026), resume: !!options["--resume"], maxDirectories: Number(options["--max-directories"] || Infinity), shouldStop: () => stopping, onProgress: progress => console.log(JSON.stringify(progress)) })
  if (!stopping && (options["--extract-root"] || options["--extract-limit"])) manifest = await extractSources({ ...config, rootOnly: !!options["--extract-root"], limit: Number(options["--extract-limit"] || 10) })
  console.log(JSON.stringify(summarizeAudit(manifest), null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
