import type { InventorySnapshot } from "@/features/inventory/domain/inventory"
import { buildOperationsReports } from "@/features/reports/domain/operations-reports"

export type OverviewSiteFilter = "all" | string

function startOfUtcWeek(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = start.getUTCDay()
  start.setUTCDate(start.getUTCDate() - (day === 0 ? 6 : day - 1))
  return start.getTime()
}

export function buildOverviewMetrics(snapshot: InventorySnapshot, siteId: OverviewSiteFilter = "all", now = new Date()) {
  const matchesSite = (value: string) => siteId === "all" || value === siteId
  const presentLots = snapshot.lots.filter((lot) => lot.presence === "Present" && matchesSite(lot.siteId))
  const projectIds = new Set(presentLots.map((lot) => lot.projectId))
  const reports = buildOperationsReports(snapshot, { siteId }, now)
  const weekStart = startOfUtcWeek(now)
  const activeIssues = snapshot.issues.filter((issue) => matchesSite(issue.siteId) && (issue.status === "Open" || issue.status === "In Progress"))
  const blockingIssues = activeIssues.filter((issue) => issue.blocking)
  const damagedMaterial = activeIssues.filter((issue) => issue.type === "Damaged")
  const verification = {
    current: reports.verification.filter((row) => row.state === "Verified").length,
    overdue: reports.verification.filter((row) => row.state === "Overdue").length,
    never: reports.verification.filter((row) => row.state === "Never verified").length,
  }
  const siteSnapshots = snapshot.sites.filter((site) => site.active && (siteId === "all" || site.id === siteId)).map((site) => {
    const lots = snapshot.lots.filter((lot) => lot.siteId === site.id && lot.presence === "Present")
    const issues = snapshot.issues.filter((issue) => issue.siteId === site.id && (issue.status === "Open" || issue.status === "In Progress"))
    const siteVerification = buildOperationsReports(snapshot, { siteId: site.id }, now).verification
    return {
      id: site.id,
      slug: site.slug,
      name: site.name,
      projects: new Set(lots.map((lot) => lot.projectId)).size,
      lots: lots.length,
      knownPackages: lots.reduce((total, lot) => total + (lot.quantity ?? 0), 0),
      unknownLots: lots.filter((lot) => lot.quantity === null).length,
      activeIssues: issues.length,
      verificationDue: siteVerification.filter((row) => row.state !== "Verified").length,
    }
  })
  return {
    projects: projectIds.size,
    presentLots: presentLots.length,
    verificationDue: verification.overdue + verification.never,
    blockingIssues: blockingIssues.length,
    verification,
    siteSnapshots,
    workflow: {
      receiptsThisWeek: snapshot.receipts.filter((receipt) => receipt.status === "Received" && matchesSite(receipt.siteId) && receipt.completedAt && Date.parse(receipt.completedAt) >= weekStart).length,
      movementsThisWeek: snapshot.movements.filter((movement) => matchesSite(movement.siteId) && Date.parse(movement.occurredAt) >= weekStart).length,
      activeOutbound: snapshot.outboundBatches.filter((batch) => matchesSite(batch.siteId) && (batch.state === "Planned" || batch.state === "Ready")).length,
      departedThisWeek: snapshot.outboundBatches.filter((batch) => matchesSite(batch.siteId) && batch.state === "Departed" && batch.departedAt && Date.parse(batch.departedAt) >= weekStart).length,
    },
    attention: {
      verificationDue: verification.overdue + verification.never,
      blockingIssues: blockingIssues.length,
      damagedMaterial: damagedMaterial.length,
      readyOutbound: snapshot.outboundBatches.filter((batch) => matchesSite(batch.siteId) && batch.state === "Ready").length,
    },
    recentActivity: snapshot.activities.filter((event) => matchesSite(event.siteId)).toSorted((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)).slice(0, 5),
  }
}
