import { VERIFICATION_WINDOW_DAYS, type InventorySnapshot, type Issue, type MaterialLot, type StoragePosition } from "@/features/inventory/domain/inventory"

export function isIssueActive(issue: Issue) {
  return issue.status === "Open" || issue.status === "In Progress"
}

export function issueEvidenceState(snapshot: InventorySnapshot, issue: Issue) {
  if (issue.type !== "Damaged") return "Optional" as const
  return issue.photoIds.some((photoId) => snapshot.photos.some((photo) => photo.id === photoId && photo.contentType.startsWith("image/"))) ? "Complete" as const : "Needs evidence" as const
}

export function projectLots(snapshot: InventorySnapshot, projectId: string) {
  return snapshot.lots.filter((lot) => lot.projectId === projectId && lot.presence === "Present")
}

export function lotVerificationState(snapshot: InventorySnapshot, lot: MaterialLot, now = new Date()) {
  const latest = snapshot.verifications.filter((record) => record.lotId === lot.id).toSorted((a, b) => Date.parse(b.verifiedAt) - Date.parse(a.verifiedAt))[0]
  if (!latest) return { label: "Needs verification" as const, latest: null }
  const dueAt = new Date(latest.verifiedAt)
  dueAt.setUTCDate(dueAt.getUTCDate() + VERIFICATION_WINDOW_DAYS)
  return { label: dueAt.getTime() <= now.getTime() ? "Needs verification" as const : "Verified" as const, latest }
}

export function describePosition(position: StoragePosition) {
  if (position.precision === "Unknown") return "Position unknown"
  if (position.precision === "General") return position.note || "General location"
  return [position.row, position.column, position.note].filter(Boolean).join(" · ")
}

export function projectPackageTotal(snapshot: InventorySnapshot, projectId: string) {
  const lots = projectLots(snapshot, projectId)
  const known = lots.filter((lot) => lot.quantity !== null)
  return { known: known.reduce((total, lot) => total + (lot.quantity ?? 0), 0), unknownLots: lots.length - known.length }
}

export function activeOutboundLines(snapshot: InventorySnapshot, lotId: string) {
  const activeBatchIds = new Set(
    snapshot.outboundBatches
      .filter((batch) => batch.state === "Planned" || batch.state === "Ready")
      .map((batch) => batch.id),
  )
  return snapshot.outboundLines.filter(
    (line) => line.sourceLotId === lotId && activeBatchIds.has(line.batchId),
  )
}

export function reservedOutboundQuantity(snapshot: InventorySnapshot, lot: MaterialLot) {
  const lines = activeOutboundLines(snapshot, lot.id)
  if (!lines.length) return 0
  if (lot.quantity === null || lines.some((line) => line.quantity === null)) return null
  return lines.reduce((total, line) => total + (line.quantity ?? 0), 0)
}

export function projectReadiness(snapshot: InventorySnapshot, projectId: string, now = new Date()) {
  const lots = projectLots(snapshot, projectId)
  const blockingIssues = snapshot.issues.filter(
    (issue) =>
      issue.projectId === projectId && isIssueActive(issue) && issue.blocking,
  )
  const verificationDue = lots.filter(
    (lot) => lotVerificationState(snapshot, lot, now).label === "Needs verification",
  )
  const reasons: string[] = []

  if (!lots.length) reasons.push("No material is currently present on site.")
  if (blockingIssues.length) {
    reasons.push(
      `${blockingIssues.length} unresolved blocking ${blockingIssues.length === 1 ? "issue" : "issues"}.`,
    )
  }
  if (verificationDue.length) {
    reasons.push(
      `${verificationDue.length} material ${verificationDue.length === 1 ? "lot needs" : "lots need"} verification.`,
    )
  }

  const status = !lots.length
    ? "No material"
    : blockingIssues.length
      ? "Blocked"
      : verificationDue.length
        ? "Needs verification"
        : "Ready"

  return { status, reasons, lots, blockingIssues, verificationDue } as const
}

export function searchInventory(snapshot: InventorySnapshot, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return snapshot.projects.map((project) => ({ project, explanation: null as string | null }))

  return snapshot.projects.flatMap((project) => {
    const aliases = snapshot.aliases.filter((alias) => alias.projectId === project.id)
    const groups = snapshot.groups.filter((group) => group.projectId === project.id)
    const lots = snapshot.lots.filter((lot) => lot.projectId === project.id)
    const locations = snapshot.locations.filter((location) => lots.some((lot) => lot.locationId === location.id))
    const direct = [project.name, project.jobNumber, ...project.purchaseOrders, ...groups.map((group) => group.name), ...locations.map((location) => location.name)].some((value) => value.toLowerCase().includes(normalized))
    const alias = aliases.find((value) => value.value.toLowerCase().includes(normalized))
    if (!direct && !alias) return []
    return [{ project, explanation: alias ? `Matched ${alias.type.toLowerCase()}: ${alias.value}` : null }]
  })
}
