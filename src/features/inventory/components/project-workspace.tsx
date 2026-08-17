"use client"

import Link from "next/link"
import { Camera, ClipboardCheck, MapPin, PackageOpen, ShieldAlert } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddMaterialSheet } from "@/features/inventory/components/lot-actions"
import { RecordIssueSheet } from "@/features/inventory/components/issue-actions"
import { LotLedger } from "@/features/inventory/components/lot-ledger"
import { StatusBadge } from "@/features/inventory/components/status-badge"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { projectLots, projectPackageTotal, projectReadiness } from "@/features/inventory/domain/selectors"

const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

export function ProjectWorkspace({ slug }: { slug: string }) {
  const { snapshot, isHydrating } = useInventory()
  const project = snapshot.projects.find((item) => item.slug === slug)
  if (!project) return <div className="rounded-xl border border-dashed p-8 text-center"><h1 className="font-semibold">Project not available</h1><p className="mt-1 text-sm text-muted-foreground">This project is not present in the local inventory dataset.</p></div>
  const lots = projectLots(snapshot, project.id)
  const totals = projectPackageTotal(snapshot, project.id)
  const locationIds = [...new Set(lots.map((lot) => lot.locationId).filter(Boolean))]
  const projectPhotos = snapshot.photos.filter((photo) => photo.projectId === project.id)
  const activity = snapshot.activities.filter((event) => event.projectId === project.id).toSorted((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
  const openIssues = snapshot.issues.filter((issue) => issue.projectId === project.id && issue.status === "Open")
  const readiness = projectReadiness(snapshot, project.id)

  return <div className="flex flex-1 flex-col gap-6">
    <PageHeader eyebrow="Inventory project" title={project.name} description={`Job ${project.jobNumber} · ${project.purchaseOrders.join(" · ")}`} />
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-xl">{project.name}</CardTitle><StatusBadge status={project.status} /></div><CardDescription className="mt-1">Job {project.jobNumber} · {project.purchaseOrders.join(" · ")}{isHydrating ? " · Loading saved device records…" : ""}</CardDescription></div>
          <div className="flex flex-col gap-2 sm:flex-row"><RecordIssueSheet projectId={project.id} /><AddMaterialSheet projectId={project.id} /></div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Known packages</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{totals.known}</p>{totals.unknownLots ? <p className="text-xs text-muted-foreground">+ {totals.unknownLots} unknown lot{totals.unknownLots === 1 ? "" : "s"}</p> : null}</div>
        <div><p className="text-xs text-muted-foreground">Material lots</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{lots.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Photos</p><p className="mt-1 flex items-center gap-1.5 font-mono text-2xl font-semibold tabular-nums"><Camera aria-hidden="true" />{projectPhotos.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Open issues</p><p className="mt-1 flex items-center gap-1.5 font-mono text-2xl font-semibold tabular-nums"><ShieldAlert aria-hidden="true" />{openIssues.length}</p></div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><CardTitle className="flex items-center gap-2"><ClipboardCheck aria-hidden="true" />Project readiness</CardTitle><Badge variant={readiness.status === "Ready" ? "secondary" : readiness.status === "Blocked" ? "destructive" : "outline"}>{readiness.status}</Badge></div><CardDescription className="mt-1">Readiness is derived from present lots, 14-day verification, and unresolved blocking issues—not the project status.</CardDescription></div>
          <Button nativeButton={false} render={<Link href={`/inventory/outbound?project=${project.id}`} />} size="lg"><PackageOpen aria-hidden="true" data-icon="inline-start" />Prepare outbound</Button>
        </div>
      </CardHeader>
      <CardContent>{readiness.reasons.length ? <ul className="flex flex-col gap-2">{readiness.reasons.map((reason) => <li key={reason} className="rounded-lg bg-muted/55 px-3 py-2 text-sm">{reason}</li>)}</ul> : <p className="text-sm text-muted-foreground">All present lots are verified and no blocking issue is open.</p>}</CardContent>
    </Card>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.7fr)]">
      <Card><CardHeader><CardTitle>Material lot ledger</CardTitle><CardDescription>Quantity, physical location, restrictions, and 14-day verification state in one operational scan.</CardDescription></CardHeader><CardContent>{lots.length ? <LotLedger lots={lots} snapshot={snapshot} /> : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No material lots are present for this project.</p>}</CardContent></Card>
      <aside className="flex flex-col gap-6">
        <Card><CardHeader><CardTitle>Storage locations</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{locationIds.map((id) => { const location = snapshot.locations.find((item) => item.id === id); return location ? <Link key={location.id} href={`/inventory/storage/${location.slug}`} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 font-medium hover:bg-muted"><MapPin aria-hidden="true" data-icon="inline-start" />{location.name}</Link> : null })}</CardContent></Card>
        <Card><CardHeader><CardTitle>Recent activity</CardTitle></CardHeader><CardContent><ol className="flex flex-col gap-3">{activity.slice(0, 8).map((event) => <li key={event.id} className="border-l-2 border-l-brand-orange pl-3"><p className="text-sm font-medium">{event.description}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatter.format(new Date(event.occurredAt))} · {event.operatorName}</p></li>)}</ol></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><PackageOpen aria-hidden="true" />Project notes</CardTitle></CardHeader><CardContent><ul className="flex flex-col gap-2">{project.notes.map((note) => <li key={note} className="rounded-lg bg-muted/55 p-3 text-sm">{note}</li>)}</ul></CardContent></Card>
      </aside>
    </div>
  </div>
}
