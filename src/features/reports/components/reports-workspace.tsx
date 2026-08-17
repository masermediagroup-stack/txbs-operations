"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  Download,
  Filter,
  PackageCheck,
  ShieldCheck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useInventory } from "@/features/inventory/components/inventory-provider";
import {
  buildOperationsReports,
  REPORT_FORMULA_VERSION,
  toCsv,
  type CsvValue,
  type ReportFilters,
} from "@/features/reports/domain/operations-reports";

type ReportCategory =
  | "verification"
  | "material-age"
  | "locations"
  | "receiving"
  | "issues"
  | "readiness"
  | "outbound"
  | "activity";

type DisplayCell = {
  label: string;
  display: string;
  sort: string | number;
  csv: CsvValue;
};

type DisplayRow = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
  cells: DisplayCell[];
};

type DisplayReport = {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  rows: DisplayRow[];
};

const categories: Array<{
  id: ReportCategory;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "verification", label: "Verification", icon: CalendarClock },
  { id: "material-age", label: "Age & exposure", icon: Boxes },
  { id: "locations", label: "Storage", icon: Warehouse },
  { id: "receiving", label: "Receiving", icon: ClipboardCheck },
  { id: "issues", label: "Issues", icon: AlertCircle },
  { id: "readiness", label: "Readiness", icon: ShieldCheck },
  { id: "outbound", label: "Outbound", icon: PackageCheck },
  { id: "activity", label: "Activity", icon: Activity },
];

const initialFilters: ReportFilters = {
  siteId: "all",
  projectId: "all",
  locationId: "all",
  fromDate: "",
  toDate: "",
  query: "",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function date(timestamp: string | null) {
  return timestamp ? dateFormatter.format(new Date(timestamp)) : "Unknown";
}

function quantity(value: number | null, packageType?: string) {
  return value === null ? "Unknown" : `${value}${packageType ? ` ${packageType}` : ""}`;
}

function operationalHref(entityType: string, entityId: string, projectSlug: string | null) {
  if (entityType === "Issue") return `/inventory/issues/${entityId}`;
  if (entityType === "Movement") return "/inventory/movements";
  if (entityType === "Outbound") return "/inventory/outbound";
  if (entityType === "Receipt") return "/inventory/receiving";
  return projectSlug ? `/inventory/projects/${projectSlug}` : "/inventory/activity";
}

function badgeVariant(value: string): DisplayRow["badgeVariant"] {
  if (["Blocked", "Overdue", "Urgent", "Open", "Exception"].includes(value)) {
    return "destructive";
  }
  if (["Ready", "Verified", "Received", "Resolved", "Departed"].includes(value)) {
    return "secondary";
  }
  if (["Needs verification", "Never verified", "In Progress", "Planned"].includes(value)) {
    return "default";
  }
  return "outline";
}

function makeDisplayReport(
  category: ReportCategory,
  reports: ReturnType<typeof buildOperationsReports>,
): DisplayReport {
  if (category === "verification") {
    return {
      title: "Verification worklist",
      description: "Fourteen-day confirmation status for every present Material Lot.",
      emptyTitle: "No Material Lots match these filters",
      emptyDescription: "Clear the date, project, location, or search filters to restore the verification worklist.",
      rows: reports.verification.map((row) => ({
        id: row.id,
        title: row.projectName,
        subtitle: row.materialName,
        href: `/inventory/projects/${row.projectSlug}`,
        badge: row.state,
        badgeVariant: badgeVariant(row.state),
        cells: [
          { label: "Location", display: row.locationName, sort: row.locationName, csv: row.locationName },
          { label: "Quantity", display: quantity(row.quantity, row.packageType), sort: row.quantity ?? Number.MAX_SAFE_INTEGER, csv: row.quantity },
          { label: "Last verified", display: row.lastVerifiedAt ? date(row.lastVerifiedAt) : "Never", sort: row.lastVerifiedAt ?? "", csv: row.lastVerifiedAt },
          { label: "Due (UTC)", display: date(row.dueAt), sort: row.dueAt, csv: row.dueAt },
        ],
      })),
    };
  }
  if (category === "material-age") {
    return {
      title: "Material age and exposure",
      description: "Recorded on-site age with current protection context. Exposure duration remains Unknown until a start event exists.",
      emptyTitle: "No material age records match",
      emptyDescription: "Material appears here when a present lot matches the selected scope and UTC date range.",
      rows: reports.materialAge.map((row) => ({
        id: row.id,
        title: row.projectName,
        subtitle: row.materialName,
        href: `/inventory/projects/${row.projectSlug}`,
        badge: row.exposureState,
        badgeVariant: row.exposureState === "Exposed" || row.exposureState === "Outdoor location" ? "destructive" : "outline",
        cells: [
          { label: "Location", display: row.locationName, sort: row.locationName, csv: row.locationName },
          { label: "Recorded age", display: `${row.ageDays}d`, sort: row.ageDays, csv: row.ageDays },
          { label: "Quantity", display: quantity(row.quantity, row.packageType), sort: row.quantity ?? Number.MAX_SAFE_INTEGER, csv: row.quantity },
          { label: "Exposure duration", display: "Unknown", sort: Number.MAX_SAFE_INTEGER, csv: row.exposureDays },
        ],
      })),
    };
  }
  if (category === "locations") {
    return {
      title: "Storage contents",
      description: "Present Material Lots and package counts by confirmed Storage Location.",
      emptyTitle: "No storage contents match",
      emptyDescription: "Adjust the scope filters or record present material at a Storage Location.",
      rows: reports.locations.map((row) => ({
        id: row.id,
        title: row.locationName,
        subtitle: row.locationType,
        href: row.locationSlug ? `/inventory/storage/${row.locationSlug}` : "/inventory/storage",
        badge: `${row.lotCount} ${row.lotCount === 1 ? "lot" : "lots"}`,
        badgeVariant: "outline",
        cells: [
          { label: "Projects", display: String(row.projectCount), sort: row.projectCount, csv: row.projectCount },
          { label: "Known packages", display: String(row.knownPackages), sort: row.knownPackages, csv: row.knownPackages },
          { label: "Unknown quantities", display: String(row.unknownQuantityLots), sort: row.unknownQuantityLots, csv: row.unknownQuantityLots },
        ],
      })),
    };
  }
  if (category === "receiving") {
    return {
      title: "Receiving history",
      description: "Completed receipts and recorded package volume. Drafts are excluded.",
      emptyTitle: "No completed Receipts match",
      emptyDescription: "Complete Receiving workflows or broaden the selected UTC date range.",
      rows: reports.receiving.map((row) => ({
        id: row.id,
        title: row.projectName,
        subtitle: row.receiptNumber,
        href: row.projectSlug ? `/inventory/projects/${row.projectSlug}` : "/inventory/receiving",
        badge: row.inspectionState,
        badgeVariant: badgeVariant(row.inspectionState),
        cells: [
          { label: "Received", display: date(row.completedAt), sort: row.completedAt, csv: row.completedAt },
          { label: "Lines", display: String(row.lineCount), sort: row.lineCount, csv: row.lineCount },
          { label: "Known packages", display: String(row.knownPackages), sort: row.knownPackages, csv: row.knownPackages },
          { label: "Unknown lines", display: String(row.unknownQuantityLines), sort: row.unknownQuantityLines, csv: row.unknownQuantityLines },
          { label: "Operator", display: row.operatorName, sort: row.operatorName, csv: row.operatorName },
        ],
      })),
    };
  }
  if (category === "issues") {
    return {
      title: "Issue operations",
      description: "Active and completed exceptions with age, assignment, and blocking state.",
      emptyTitle: "No Issues match",
      emptyDescription: "Record an Issue or broaden the filters to include completed history.",
      rows: reports.issues.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: `${row.projectName} · ${row.type}`,
        href: `/inventory/issues/${row.issueId}`,
        badge: row.status,
        badgeVariant: badgeVariant(row.status),
        cells: [
          { label: "Priority", display: row.priority, sort: row.priority, csv: row.priority },
          { label: "Age", display: `${row.ageDays}d`, sort: row.ageDays, csv: row.ageDays },
          { label: "Assignee", display: row.assigneeName ?? "Unassigned", sort: row.assigneeName ?? "", csv: row.assigneeName },
          { label: "Blocking", display: row.blocking ? "Yes" : "No", sort: Number(row.blocking), csv: row.blocking },
        ],
      })),
    };
  }
  if (category === "readiness") {
    return {
      title: "Project readiness",
      description: "Derived readiness from present lots, verification work, and unresolved blocking Issues.",
      emptyTitle: "No projects match",
      emptyDescription: "Adjust the selected Site, Project, Location, or search filters.",
      rows: reports.readiness.map((row) => ({
        id: row.id,
        title: row.projectName,
        subtitle: `Project status: ${row.projectStatus}`,
        href: `/inventory/projects/${row.projectSlug}`,
        badge: row.readiness,
        badgeVariant: badgeVariant(row.readiness),
        cells: [
          { label: "Present lots", display: String(row.presentLots), sort: row.presentLots, csv: row.presentLots },
          { label: "Known packages", display: String(row.knownPackages), sort: row.knownPackages, csv: row.knownPackages },
          { label: "Unknown quantities", display: String(row.unknownQuantityLots), sort: row.unknownQuantityLots, csv: row.unknownQuantityLots },
          { label: "Verification work", display: String(row.verificationDue), sort: row.verificationDue, csv: row.verificationDue },
          { label: "Blocking Issues", display: String(row.blockingIssues), sort: row.blockingIssues, csv: row.blockingIssues },
        ],
      })),
    };
  }
  if (category === "outbound") {
    return {
      title: "Outbound history",
      description: "Planned, ready, departed, cancelled, and reversed outbound batches.",
      emptyTitle: "No Outbound Batches match",
      emptyDescription: "Plan outbound material or broaden the selected UTC date range.",
      rows: reports.outbound.map((row) => ({
        id: row.id,
        title: row.projectName,
        subtitle: `Batch ${row.batchId.slice(0, 8)}`,
        href: "/inventory/outbound",
        badge: row.state,
        badgeVariant: badgeVariant(row.state),
        cells: [
          { label: "Planned", display: date(row.plannedAt), sort: row.plannedAt, csv: row.plannedAt },
          { label: "Departed", display: row.departedAt ? date(row.departedAt) : "Not departed", sort: row.departedAt ?? "", csv: row.departedAt },
          { label: "Lots", display: String(row.lineCount), sort: row.lineCount, csv: row.lineCount },
          { label: "Known packages", display: String(row.knownPackages), sort: row.knownPackages, csv: row.knownPackages },
          { label: "Unknown lines", display: String(row.unknownQuantityLines), sort: row.unknownQuantityLines, csv: row.unknownQuantityLines },
        ],
      })),
    };
  }
  return {
    title: "Operational activity",
    description: "Append-only Inventory events with preserved operator names and source records.",
    emptyTitle: "No Activity Events match",
    emptyDescription: "Broaden the filters or complete an Inventory workflow to create activity.",
    rows: reports.activity.map((row) => ({
      id: row.id,
      title: row.type,
      subtitle: row.projectName,
      href: operationalHref(row.entityType, row.entityId, row.projectSlug),
      badge: row.entityType,
      badgeVariant: "outline",
      cells: [
        { label: "Description", display: row.description, sort: row.description, csv: row.description },
        { label: "Operator", display: row.operatorName, sort: row.operatorName, csv: row.operatorName },
        { label: "Occurred", display: date(row.occurredAt), sort: row.occurredAt, csv: row.occurredAt },
      ],
    })),
  };
}

function compare(left: string | number, right: string | number) {
  return typeof left === "number" && typeof right === "number"
    ? left - right
    : String(left).localeCompare(String(right), undefined, { numeric: true });
}

export function ReportsWorkspace({ role }: { role: "Operator" | "Tech" }) {
  const { snapshot, isHydrating } = useInventory();
  const [category, setCategory] = useState<ReportCategory>("verification");
  const [filters, setFilters] = useState(initialFilters);
  const [sortColumn, setSortColumn] = useState(0);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const reports = useMemo(
    () => buildOperationsReports(snapshot, filters),
    [filters, snapshot],
  );
  const report = useMemo(() => makeDisplayReport(category, reports), [category, reports]);
  const sortedRows = useMemo(
    () => report.rows.toSorted((left, right) => {
      const leftValue = sortColumn === 0 ? left.title : left.cells[sortColumn - 1]?.sort ?? "";
      const rightValue = sortColumn === 0 ? right.title : right.cells[sortColumn - 1]?.sort ?? "";
      return compare(leftValue, rightValue) * (sortDirection === "asc" ? 1 : -1);
    }),
    [report.rows, sortColumn, sortDirection],
  );
  const activeIssues = reports.issues.filter((row) => row.status === "Open" || row.status === "In Progress").length;
  const verificationActions = reports.verification.filter((row) => row.state !== "Verified").length;
  const readyProjects = reports.readiness.filter((row) => row.readiness === "Ready").length;
  const selectedCategory = categories.find((item) => item.id === category)!;

  function updateFilter(key: keyof ReportFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(initialFilters);
  }

  function toggleSort(column: number) {
    if (column === sortColumn) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  }

  function downloadCsv() {
    const headers = ["Record", "Context", "State", ...(sortedRows[0]?.cells.map((cell) => cell.label) ?? [])];
    const rows = sortedRows.map((row) => [
      row.title,
      row.subtitle,
      row.badge,
      ...row.cells.map((cell) => cell.csv),
    ]);
    const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tbs-${category}-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Reports"
        description="Permission-aware operational reporting with source drill-through and reproducible formulas."
      />

      <Card>
        <CardHeader className="relative border-b">
          <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 aria-hidden="true" />
                Operations intelligence
              </CardTitle>
              <CardDescription>
                Trusted worklists and totals from authorized Inventory records. Unknown values remain Unknown.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-card">{role} · assigned sites</Badge>
              <Badge variant="outline" className="bg-card">Formula {REPORT_FORMULA_VERSION}</Badge>
              {isHydrating ? <Badge>Refreshing shared data</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Present lots", reports.materialAge.length],
            ["Verification actions", verificationActions],
            ["Active Issues", activeIssues],
            ["Ready projects", readyProjects],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="relative border-b">
          <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" />
          <CardTitle className="flex items-center gap-2">
            <Filter aria-hidden="true" />
            Report scope
          </CardTitle>
          <CardDescription>
            Date filters use UTC calendar boundaries so exports remain reproducible across devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Field>
              <FieldLabel htmlFor="report-site">Site</FieldLabel>
              <NativeSelect id="report-site" className="w-full" value={filters.siteId} onChange={(event) => updateFilter("siteId", event.target.value)}>
                <NativeSelectOption value="all">All authorized sites</NativeSelectOption>
                {snapshot.sites.map((site) => <NativeSelectOption key={site.id} value={site.id}>{site.name}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="report-project">Project</FieldLabel>
              <NativeSelect id="report-project" className="w-full" value={filters.projectId} onChange={(event) => updateFilter("projectId", event.target.value)}>
                <NativeSelectOption value="all">All projects</NativeSelectOption>
                {snapshot.projects.filter((project) => filters.siteId === "all" || project.siteId === filters.siteId).map((project) => <NativeSelectOption key={project.id} value={project.id}>{project.name}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="report-location">Location</FieldLabel>
              <NativeSelect id="report-location" className="w-full" value={filters.locationId} onChange={(event) => updateFilter("locationId", event.target.value)}>
                <NativeSelectOption value="all">All locations</NativeSelectOption>
                {snapshot.locations.filter((location) => filters.siteId === "all" || location.siteId === filters.siteId).map((location) => <NativeSelectOption key={location.id} value={location.id}>{location.name}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="report-from">From (UTC)</FieldLabel>
              <Input id="report-from" type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="report-to">Through (UTC)</FieldLabel>
              <Input id="report-to" type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="report-search">Search</FieldLabel>
              <Input id="report-search" type="search" value={filters.query} onChange={(event) => updateFilter("query", event.target.value)} placeholder="Project, material, operator" autoComplete="off" />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={resetFilters}>Clear filters</Button>
          </div>
        </CardContent>
      </Card>

      <div className="-mx-1 overflow-x-auto px-1 pb-1" aria-label="Report categories">
        <div className="flex min-w-max gap-2" role="tablist">
          {categories.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={category === id}
              onClick={() => { setCategory(id); setSortColumn(0); setSortDirection("asc"); }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-selected:border-primary aria-selected:bg-accent aria-selected:text-accent-foreground"
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <Card role="tabpanel" aria-label={selectedCategory.label}>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.description}</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={downloadCsv} disabled={!sortedRows.length}>
              <Download aria-hidden="true" data-icon="inline-start" />
              Export {sortedRows.length} rows
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
            {sortedRows.length} {sortedRows.length === 1 ? "record" : "records"} in the current filtered view.
          </p>
          {sortedRows.length ? (
            <>
              <div className="hidden overflow-hidden rounded-xl border lg:block">
                <table className="w-full table-fixed text-left text-[0.8125rem] xl:text-sm">
                  <thead className="bg-muted/55 text-xs text-muted-foreground">
                    <tr>
                      {["Record", ...(sortedRows[0]?.cells.map((cell) => cell.label) ?? []), "State"].map((label, index, all) => (
                        <th key={label} className={index === 0 ? "w-[22%] px-2 py-2 font-medium xl:px-3" : "px-2 py-2 font-medium xl:px-3"}>
                          {index === all.length - 1 ? label : (
                            <button type="button" className="inline-flex max-w-full items-center gap-1 rounded text-left outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" onClick={() => toggleSort(index)}>
                              {label}<ArrowUpDown aria-hidden="true" className="size-3.5" />
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row) => (
                      <tr key={row.id} className="group relative cursor-pointer border-t align-middle transition-colors hover:bg-muted/45 focus-within:bg-muted/45">
                        <td className="min-w-0 px-2 py-3 xl:px-3">
                          <Link href={row.href} className="outline-none after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
                            <span className="block break-words font-medium">{row.title}</span>
                            <span className="block break-words text-xs text-muted-foreground">{row.subtitle}</span>
                          </Link>
                        </td>
                        {row.cells.map((cell) => <td key={cell.label} className="min-w-0 break-words px-2 py-3 align-middle tabular-nums xl:px-3">{cell.display}</td>)}
                        <td className="min-w-0 px-2 py-3 xl:px-3"><Badge variant={row.badgeVariant} className="max-w-full whitespace-normal text-left">{row.badge}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 lg:hidden">
                {sortedRows.map((row) => (
                  <Link key={row.id} href={row.href} className="touch-manipulation rounded-xl border p-4 outline-none hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring">
                    <div><h2 className="break-words font-semibold">{row.title}</h2><p className="break-words text-xs text-muted-foreground">{row.subtitle}</p></div>
                    <Badge variant={row.badgeVariant} className="mt-3">{row.badge}</Badge>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      {row.cells.map((cell) => <div key={cell.label} className="flex items-start justify-between gap-4 border-t pt-2"><dt className="text-muted-foreground">{cell.label}</dt><dd className="text-right font-medium tabular-nums">{cell.display}</dd></div>)}
                    </dl>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <Empty className="border border-dashed bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon"><selectedCategory.icon aria-hidden="true" /></EmptyMedia>
                <EmptyTitle>{report.emptyTitle}</EmptyTitle>
                <EmptyDescription>{report.emptyDescription}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
