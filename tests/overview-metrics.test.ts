import { describe, expect, it } from "vitest"

import { inventorySeed } from "@/features/inventory/data/seed-data"
import { buildOverviewMetrics } from "@/features/overview/domain/overview-metrics"

describe("Overview metrics", () => {
  it("defaults to all active Sites and keeps unknown quantities out of known package totals", () => {
    const metrics = buildOverviewMetrics(inventorySeed, "all", new Date("2026-08-19T17:00:00.000Z"))
    const presentLots = inventorySeed.lots.filter((lot) => lot.presence === "Present")
    expect(metrics.presentLots).toBe(presentLots.length)
    expect(metrics.projects).toBe(new Set(presentLots.map((lot) => lot.projectId)).size)
    expect(metrics.siteSnapshots).toHaveLength(inventorySeed.sites.filter((site) => site.active).length)
    expect(metrics.siteSnapshots.reduce((total, site) => total + site.knownPackages, 0)).toBe(presentLots.reduce((total, lot) => total + (lot.quantity ?? 0), 0))
  })

  it("filters physical counts by the lot Site rather than the Project's legacy Site", () => {
    const richardson = inventorySeed.sites.find((site) => site.slug === "richardson-office-warehouse")!
    const metrics = buildOverviewMetrics(inventorySeed, richardson.id, new Date("2026-08-19T17:00:00.000Z"))
    const lots = inventorySeed.lots.filter((lot) => lot.siteId === richardson.id && lot.presence === "Present")
    expect(metrics.presentLots).toBe(lots.length)
    expect(metrics.projects).toBe(new Set(lots.map((lot) => lot.projectId)).size)
    expect(metrics.siteSnapshots.map((site) => site.id)).toEqual([richardson.id])
  })
})
