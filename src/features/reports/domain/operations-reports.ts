import type { InventorySnapshot, MaterialLot } from "@/features/inventory/domain/inventory";
import { projectReadiness } from "@/features/inventory/domain/selectors";

export const REPORT_FORMULA_VERSION = "phase-10-v1";
export const REPORT_VERIFICATION_DAYS = 14;

const dayMs = 86_400_000;

export type ReportFilters = {
  siteId: string;
  projectId: string;
  locationId: string;
  fromDate: string;
  toDate: string;
  query: string;
};

export type VerificationReportRow = {
  id: string;
  siteId: string;
  lotId: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  materialName: string;
  locationId: string | null;
  locationName: string;
  quantity: number | null;
  packageType: string;
  lastVerifiedAt: string | null;
  dueAt: string;
  state: "Verified" | "Overdue" | "Never verified";
};

export type MaterialAgeReportRow = {
  id: string;
  siteId: string;
  lotId: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  materialName: string;
  locationId: string | null;
  locationName: string;
  packageType: string;
  quantity: number | null;
  recordedAt: string;
  ageDays: number;
  exposureState: "Exposed" | "Outdoor location" | "Not exposed" | "Unknown";
  exposureDays: number | null;
};

export type LocationContentsReportRow = {
  id: string;
  siteId: string;
  locationId: string | null;
  locationSlug: string | null;
  locationName: string;
  locationType: string;
  lotCount: number;
  projectCount: number;
  knownPackages: number;
  unknownQuantityLots: number;
};

export type ReceivingReportRow = {
  id: string;
  siteId: string;
  receiptId: string;
  projectId: string | null;
  projectSlug: string | null;
  projectName: string;
  receiptNumber: string;
  identityState: string;
  inspectionState: string;
  completedAt: string;
  lineCount: number;
  knownPackages: number;
  unknownQuantityLines: number;
  operatorName: string;
};

export type IssueReportRow = {
  id: string;
  siteId: string;
  issueId: string;
  projectId: string | null;
  projectName: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  blocking: boolean;
  assigneeName: string | null;
  ageDays: number;
  createdAt: string;
  updatedAt: string;
};

export type ReadinessReportRow = {
  id: string;
  siteId: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  projectStatus: string;
  readiness: "Ready" | "Blocked" | "Needs verification" | "No material";
  presentLots: number;
  knownPackages: number;
  unknownQuantityLots: number;
  verificationDue: number;
  blockingIssues: number;
};

export type OutboundReportRow = {
  id: string;
  siteId: string;
  batchId: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  state: string;
  plannedAt: string;
  departedAt: string | null;
  lineCount: number;
  knownPackages: number;
  unknownQuantityLines: number;
  operatorName: string;
};

export type ActivityReportRow = {
  id: string;
  siteId: string;
  eventId: string;
  projectId: string | null;
  projectSlug: string | null;
  projectName: string;
  entityType: string;
  entityId: string;
  type: string;
  description: string;
  occurredAt: string;
  operatorName: string;
};

export type OperationsReports = {
  formulaVersion: typeof REPORT_FORMULA_VERSION;
  generatedAt: string;
  verification: VerificationReportRow[];
  materialAge: MaterialAgeReportRow[];
  locations: LocationContentsReportRow[];
  receiving: ReceivingReportRow[];
  issues: IssueReportRow[];
  readiness: ReadinessReportRow[];
  outbound: OutboundReportRow[];
  activity: ActivityReportRow[];
};

const emptyFilters: ReportFilters = {
  siteId: "all",
  projectId: "all",
  locationId: "all",
  fromDate: "",
  toDate: "",
  query: "",
};

function ageInDays(timestamp: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(timestamp)) / dayMs));
}

function addUtcDays(timestamp: string, days: number) {
  return new Date(Date.parse(timestamp) + days * dayMs).toISOString();
}

function inUtcDateRange(timestamp: string, filters: ReportFilters) {
  const value = Date.parse(timestamp);
  if (filters.fromDate && value < Date.parse(`${filters.fromDate}T00:00:00.000Z`)) {
    return false;
  }
  if (filters.toDate && value >= Date.parse(`${filters.toDate}T00:00:00.000Z`) + dayMs) {
    return false;
  }
  return true;
}

function containsQuery(query: string, ...values: Array<string | null | undefined>) {
  const normalized = query.trim().toLocaleLowerCase();
  return (
    !normalized ||
    values.some((value) => value?.toLocaleLowerCase().includes(normalized))
  );
}

function lotMatches(snapshot: InventorySnapshot, lot: MaterialLot, filters: ReportFilters) {
  const project = snapshot.projects.find((item) => item.id === lot.projectId);
  const group = snapshot.groups.find((item) => item.id === lot.groupId);
  const location = snapshot.locations.find((item) => item.id === lot.locationId);
  return (
    lot.presence === "Present" &&
    (filters.siteId === "all" || lot.siteId === filters.siteId) &&
    (filters.projectId === "all" || lot.projectId === filters.projectId) &&
    (filters.locationId === "all" || lot.locationId === filters.locationId) &&
    inUtcDateRange(lot.createdAt, filters) &&
    containsQuery(
      filters.query,
      project?.name,
      project?.jobNumber,
      group?.name,
      location?.name,
      lot.packageType,
    )
  );
}

function projectAndMaterial(snapshot: InventorySnapshot, lot: MaterialLot) {
  const project = snapshot.projects.find((item) => item.id === lot.projectId);
  const group = snapshot.groups.find((item) => item.id === lot.groupId);
  const location = snapshot.locations.find((item) => item.id === lot.locationId);
  return {
    projectSlug: project?.slug ?? "",
    projectName: project?.name ?? "Unknown project",
    materialName: group?.name ?? "Unknown material",
    locationName: location?.name ?? "Unknown / not assigned",
  };
}

export function buildOperationsReports(
  snapshot: InventorySnapshot,
  input: Partial<ReportFilters> = {},
  now = new Date(),
): OperationsReports {
  const filters = { ...emptyFilters, ...input };
  const presentLots = snapshot.lots.filter((lot) => lotMatches(snapshot, lot, filters));

  const verification = presentLots
    .map((lot): VerificationReportRow => {
      const latest = snapshot.verifications
        .filter((record) => record.lotId === lot.id)
        .toSorted((left, right) => Date.parse(right.verifiedAt) - Date.parse(left.verifiedAt))[0];
      const basis = latest?.verifiedAt ?? lot.createdAt;
      const dueAt = addUtcDays(basis, REPORT_VERIFICATION_DAYS);
      const state = !latest
        ? "Never verified"
        : Date.parse(dueAt) <= now.getTime()
          ? "Overdue"
          : "Verified";
      return {
        id: lot.id,
        siteId: lot.siteId,
        lotId: lot.id,
        projectId: lot.projectId,
        ...projectAndMaterial(snapshot, lot),
        locationId: lot.locationId,
        quantity: lot.quantity,
        packageType: lot.packageType,
        lastVerifiedAt: latest?.verifiedAt ?? null,
        dueAt,
        state,
      };
    })
    .toSorted((left, right) => {
      const priority = { "Never verified": 0, Overdue: 1, Verified: 2 } as const;
      return priority[left.state] - priority[right.state] || left.dueAt.localeCompare(right.dueAt);
    });

  const materialAge = presentLots
    .map((lot): MaterialAgeReportRow => {
      const detail = projectAndMaterial(snapshot, lot);
      const location = snapshot.locations.find((item) => item.id === lot.locationId);
      const exposureState = lot.protection === "Exposed"
        ? "Exposed"
        : location?.type === "Outdoor"
          ? "Outdoor location"
          : lot.protection === "Unknown"
            ? "Unknown"
            : "Not exposed";
      return {
        id: lot.id,
        siteId: lot.siteId,
        lotId: lot.id,
        projectId: lot.projectId,
        ...detail,
        locationId: lot.locationId,
        packageType: lot.packageType,
        quantity: lot.quantity,
        recordedAt: lot.createdAt,
        ageDays: ageInDays(lot.createdAt, now),
        exposureState,
        exposureDays: null,
      };
    })
    .toSorted((left, right) => right.ageDays - left.ageDays || left.projectName.localeCompare(right.projectName));

  const locationKeys = new Set<string | null>(presentLots.map((lot) => lot.locationId));
  const locations = [...locationKeys]
    .map((locationId): LocationContentsReportRow => {
      const locationLots = presentLots.filter((lot) => lot.locationId === locationId);
      const location = snapshot.locations.find((item) => item.id === locationId);
      return {
        id: locationId ?? "unknown-location",
        siteId: location?.siteId ?? locationLots[0]?.siteId ?? "",
        locationId,
        locationSlug: location?.slug ?? null,
        locationName: location?.name ?? "Unknown / not assigned",
        locationType: location?.type ?? "Unknown",
        lotCount: locationLots.length,
        projectCount: new Set(locationLots.map((lot) => lot.projectId)).size,
        knownPackages: locationLots.reduce((total, lot) => total + (lot.quantity ?? 0), 0),
        unknownQuantityLots: locationLots.filter((lot) => lot.quantity === null).length,
      };
    })
    .toSorted((left, right) => left.locationName.localeCompare(right.locationName));

  const receiving = snapshot.receipts
    .filter((receipt) => {
      const project = snapshot.projects.find((item) => item.id === receipt.projectId);
      const lines = snapshot.receiptLines.filter((line) => line.receiptId === receipt.id);
      return (
        receipt.status === "Received" &&
        Boolean(receipt.completedAt) &&
        (filters.siteId === "all" || receipt.siteId === filters.siteId) &&
        (filters.projectId === "all" || receipt.projectId === filters.projectId) &&
        (filters.locationId === "all" || lines.some((line) => line.targetLocationId === filters.locationId)) &&
        inUtcDateRange(receipt.completedAt!, filters) &&
        containsQuery(filters.query, receipt.receiptNumber, project?.name, receipt.handwrittenProjectText, ...lines.map((line) => line.materialName))
      );
    })
    .map((receipt): ReceivingReportRow => {
      const project = snapshot.projects.find((item) => item.id === receipt.projectId);
      const lines = snapshot.receiptLines.filter((line) => line.receiptId === receipt.id);
      return {
        id: receipt.id,
        siteId: receipt.siteId,
        receiptId: receipt.id,
        projectId: receipt.projectId,
        projectSlug: project?.slug ?? null,
        projectName: project?.name ?? (receipt.handwrittenProjectText || "Unresolved shipment"),
        receiptNumber: receipt.receiptNumber || "No receipt number",
        identityState: receipt.identityState,
        inspectionState: receipt.inspectionState,
        completedAt: receipt.completedAt!,
        lineCount: lines.length,
        knownPackages: lines.reduce((total, line) => total + (line.quantity ?? 0), 0),
        unknownQuantityLines: lines.filter((line) => line.quantity === null).length,
        operatorName: receipt.operatorName,
      };
    })
    .toSorted((left, right) => right.completedAt.localeCompare(left.completedAt));

  const issues = snapshot.issues
    .filter((issue) => {
      const project = snapshot.projects.find((item) => item.id === issue.projectId);
      const lot = snapshot.lots.find((item) => item.id === issue.lotId);
      const locationId = issue.locationId ?? lot?.locationId ?? null;
      return (
        (filters.siteId === "all" || issue.siteId === filters.siteId) &&
        (filters.projectId === "all" || issue.projectId === filters.projectId) &&
        (filters.locationId === "all" || locationId === filters.locationId) &&
        inUtcDateRange(issue.createdAt, filters) &&
        containsQuery(filters.query, issue.title, issue.description, issue.type, issue.assigneeName, project?.name)
      );
    })
    .map((issue): IssueReportRow => ({
      id: issue.id,
      siteId: issue.siteId,
      issueId: issue.id,
      projectId: issue.projectId,
      projectName: snapshot.projects.find((item) => item.id === issue.projectId)?.name ?? "No project assigned",
      title: issue.title,
      type: issue.type,
      priority: issue.priority,
      status: issue.status,
      blocking: issue.blocking,
      assigneeName: issue.assigneeName,
      ageDays: ageInDays(issue.createdAt, now),
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    }))
    .toSorted((left, right) => Number(right.status === "Open" || right.status === "In Progress") - Number(left.status === "Open" || left.status === "In Progress") || right.updatedAt.localeCompare(left.updatedAt));

  const readiness = snapshot.projects
    .filter((project) => {
      const lots = snapshot.lots.filter((lot) => lot.projectId === project.id && lot.presence === "Present");
      return (
        (filters.siteId === "all" || project.siteId === filters.siteId) &&
        (filters.projectId === "all" || project.id === filters.projectId) &&
        (filters.locationId === "all" || lots.some((lot) => lot.locationId === filters.locationId)) &&
        containsQuery(filters.query, project.name, project.jobNumber, ...project.purchaseOrders)
      );
    })
    .map((project): ReadinessReportRow => {
      const result = projectReadiness(snapshot, project.id, now);
      const knownLots = result.lots.filter((lot) => lot.quantity !== null);
      return {
        id: project.id,
        siteId: project.siteId,
        projectId: project.id,
        projectSlug: project.slug,
        projectName: project.name,
        projectStatus: project.status,
        readiness: result.status,
        presentLots: result.lots.length,
        knownPackages: knownLots.reduce((total, lot) => total + (lot.quantity ?? 0), 0),
        unknownQuantityLots: result.lots.length - knownLots.length,
        verificationDue: result.verificationDue.length,
        blockingIssues: result.blockingIssues.length,
      };
    })
    .toSorted((left, right) => {
      const priority = { Blocked: 0, "Needs verification": 1, Ready: 2, "No material": 3 } as const;
      return priority[left.readiness] - priority[right.readiness] || left.projectName.localeCompare(right.projectName);
    });

  const outbound = snapshot.outboundBatches
    .filter((batch) => {
      const project = snapshot.projects.find((item) => item.id === batch.projectId);
      const lines = snapshot.outboundLines.filter((line) => line.batchId === batch.id);
      return (
        (filters.siteId === "all" || batch.siteId === filters.siteId) &&
        (filters.projectId === "all" || batch.projectId === filters.projectId) &&
        (filters.locationId === "all" || lines.some((line) => line.sourceLocationId === filters.locationId)) &&
        inUtcDateRange(batch.departedAt ?? batch.plannedAt, filters) &&
        containsQuery(filters.query, project?.name, batch.state, batch.operatorName, batch.carrierReference, ...lines.map((line) => line.materialName))
      );
    })
    .map((batch): OutboundReportRow => {
      const project = snapshot.projects.find((item) => item.id === batch.projectId);
      const lines = snapshot.outboundLines.filter((line) => line.batchId === batch.id);
      return {
        id: batch.id,
        siteId: batch.siteId,
        batchId: batch.id,
        projectId: batch.projectId,
        projectSlug: project?.slug ?? "",
        projectName: project?.name ?? "Unknown project",
        state: batch.state,
        plannedAt: batch.plannedAt,
        departedAt: batch.departedAt,
        lineCount: lines.length,
        knownPackages: lines.reduce((total, line) => total + (line.quantity ?? 0), 0),
        unknownQuantityLines: lines.filter((line) => line.quantity === null).length,
        operatorName: batch.operatorName,
      };
    })
    .toSorted((left, right) => (right.departedAt ?? right.plannedAt).localeCompare(left.departedAt ?? left.plannedAt));

  const activity = snapshot.activities
    .filter((event) => {
      const project = snapshot.projects.find((item) => item.id === event.projectId);
      return (
        (filters.siteId === "all" || event.siteId === filters.siteId) &&
        (filters.projectId === "all" || event.projectId === filters.projectId) &&
        inUtcDateRange(event.occurredAt, filters) &&
        containsQuery(filters.query, event.type, event.description, event.operatorName, project?.name)
      );
    })
    .map((event): ActivityReportRow => {
      const project = snapshot.projects.find((item) => item.id === event.projectId);
      return {
        id: event.id,
        siteId: event.siteId,
        eventId: event.id,
        projectId: event.projectId,
        projectSlug: project?.slug ?? null,
        projectName: project?.name ?? event.entityType,
        entityType: event.entityType,
        entityId: event.entityId,
        type: event.type,
        description: event.description,
        occurredAt: event.occurredAt,
        operatorName: event.operatorName,
      };
    })
    .toSorted((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return {
    formulaVersion: REPORT_FORMULA_VERSION,
    generatedAt: now.toISOString(),
    verification,
    materialAge,
    locations,
    receiving,
    issues,
    readiness,
    outbound,
    activity,
  };
}

export type CsvValue = string | number | boolean | null;

export function toCsv(headers: string[], rows: CsvValue[][]) {
  const cell = (value: CsvValue) => {
    const text = value === null ? "Unknown" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
