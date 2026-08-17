import { describe, expect, it } from "vitest";

import { inventorySeed } from "@/features/inventory/data/seed-data";
import type { InventorySnapshot } from "@/features/inventory/domain/inventory";
import {
  buildOperationsReports,
  REPORT_FORMULA_VERSION,
  toCsv,
} from "@/features/reports/domain/operations-reports";

function fixture(): InventorySnapshot {
  return structuredClone(inventorySeed);
}

describe("Phase 10 operations reports", () => {
  it("uses the exact fourteen-day verification boundary and preserves never-verified state", () => {
    const snapshot = fixture();
    const lot = snapshot.lots[0];
    lot.createdAt = "2026-07-01T12:00:00.000Z";
    lot.quantity = null;

    let reports = buildOperationsReports(snapshot, {}, new Date("2026-08-15T12:00:00.000Z"));
    const neverVerified = reports.verification.find((row) => row.lotId === lot.id)!;
    expect(neverVerified.state).toBe("Never verified");
    expect(neverVerified.quantity).toBeNull();

    snapshot.verifications.push({
      id: "00000000-0000-4000-8000-900000000001",
      lotId: lot.id,
      verifiedAt: "2026-08-01T12:00:00.000Z",
      operatorName: "Report Fixture",
      locationId: lot.locationId,
      position: lot.position,
      note: "Boundary fixture",
      photoIds: [],
    });
    reports = buildOperationsReports(snapshot, {}, new Date("2026-08-15T12:00:00.000Z"));
    expect(reports.verification.find((row) => row.lotId === lot.id)?.state).toBe("Overdue");
    expect(reports.formulaVersion).toBe(REPORT_FORMULA_VERSION);
  });

  it("does not invent an outdoor-exposure duration", () => {
    const snapshot = fixture();
    const lot = snapshot.lots[0];
    lot.protection = "Exposed";
    const row = buildOperationsReports(snapshot, {}, new Date("2026-08-15T00:00:00.000Z"))
      .materialAge.find((item) => item.lotId === lot.id)!;
    expect(row.exposureState).toBe("Exposed");
    expect(row.exposureDays).toBeNull();
  });

  it("reports completed Receiving volume while distinguishing unknown lines from zero", () => {
    const snapshot = fixture();
    const project = snapshot.projects[0];
    const receiptId = "00000000-0000-4000-8000-900000000010";
    snapshot.receipts.push({
      id: receiptId,
      siteId: project.siteId,
      receiptNumber: "REPORT-100",
      projectId: project.id,
      identityState: "Matched",
      inspectionState: "Passed",
      status: "Received",
      handwrittenProjectText: project.name,
      physicalLabelApplied: true,
      labelPhotoId: null,
      documentPhotoIds: [],
      lineIds: ["00000000-0000-4000-8000-900000000011", "00000000-0000-4000-8000-900000000012"],
      stagingLocationId: null,
      notes: "",
      createdAt: "2026-08-10T14:00:00.000Z",
      updatedAt: "2026-08-10T15:00:00.000Z",
      completedAt: "2026-08-10T15:00:00.000Z",
      operatorName: "Report Fixture",
    });
    snapshot.receiptLines.push(
      {
        id: "00000000-0000-4000-8000-900000000011",
        receiptId,
        materialName: "Known packages",
        description: "",
        packageType: "Box",
        quantity: 0,
        condition: "Good",
        protection: "Indoor",
        accessibility: "Accessible",
        handlingRequirements: [],
        targetLocationId: null,
        photoIds: [],
      },
      {
        id: "00000000-0000-4000-8000-900000000012",
        receiptId,
        materialName: "Unknown packages",
        description: "",
        packageType: "Mixed",
        quantity: null,
        condition: "Needs inspection",
        protection: "Unknown",
        accessibility: "Unknown",
        handlingRequirements: [],
        targetLocationId: null,
        photoIds: [],
      },
    );

    const reports = buildOperationsReports(snapshot, {
      fromDate: "2026-08-10",
      toDate: "2026-08-10",
    });
    expect(reports.receiving).toHaveLength(1);
    expect(reports.receiving[0]).toMatchObject({
      knownPackages: 0,
      unknownQuantityLines: 1,
      lineCount: 2,
    });
    expect(buildOperationsReports(snapshot, { fromDate: "2026-08-11" }).receiving).toHaveLength(0);
  });

  it("applies site, project, location, date, and text filters to source-backed rows", () => {
    const snapshot = fixture();
    const lot = snapshot.lots[0];
    const project = snapshot.projects.find((item) => item.id === lot.projectId)!;
    const report = buildOperationsReports(snapshot, {
      siteId: lot.siteId,
      projectId: lot.projectId,
      locationId: lot.locationId!,
      fromDate: lot.createdAt.slice(0, 10),
      toDate: lot.createdAt.slice(0, 10),
      query: project.name,
    });
    expect(report.materialAge.length).toBeGreaterThan(0);
    expect(report.materialAge.every((row) => row.projectId === project.id)).toBe(true);
    expect(buildOperationsReports(snapshot, { query: "no-report-record-will-match" }).materialAge).toHaveLength(0);
  });

  it("exports unknown values explicitly and escapes CSV content", () => {
    const csv = toCsv(
      ["Project", "Quantity", "Note"],
      [["Lavon, North", null, "Mirror \"A\""]],
    );
    expect(csv).toBe('Project,Quantity,Note\r\n"Lavon, North",Unknown,"Mirror ""A"""');
    expect(csv).not.toContain(",0,");
  });
});
