"use client"

import Link from "next/link"
import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { RecordIssueSheet } from "@/features/inventory/components/issue-actions"
import { LotLedger } from "@/features/inventory/components/lot-ledger"
import { StatusBadge } from "@/features/inventory/components/status-badge"

export function StorageWorkspace({ slug }: { slug: string }) {
  const { snapshot } = useInventory()
  const location = snapshot.locations.find((item) => item.slug === slug)
  if (!location) return <Link href="/inventory/storage" className="group block rounded-xl border border-dashed bg-card p-8 text-center outline-none transition hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft aria-hidden="true" className="mx-auto mb-3 text-muted-foreground transition group-hover:-translate-x-0.5" /><span className="block font-semibold">Storage location not available</span><span className="mt-1 block text-sm text-muted-foreground">Return to Storage and choose an active location.</span></Link>
  const site = snapshot.sites.find((item) => item.id === location.siteId)
  const lots = snapshot.lots.filter((lot) => lot.locationId === location.id && lot.presence === "Present")
  const projects = snapshot.projects.filter((project) => lots.some((lot) => lot.projectId === project.id))
  const knownPackages = lots.reduce((total, lot) => total + (lot.quantity ?? 0), 0)
  const unknownLots = lots.filter((lot) => lot.quantity === null).length
  return <div className="flex flex-1 flex-col gap-6">
    <PageHeader eyebrow={`${location.type} storage`} title={location.name} description={[location.zone, site?.name].filter((value, index, values) => value && values.indexOf(value) === index).join(" · ")} />
    <Card><CardHeader className="relative border-b"><span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" /><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-xl">{location.name}</CardTitle><CardDescription>{location.type} · {location.zone}</CardDescription></div><RecordIssueSheet locationId={location.id} /></div></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Projects</p><p className="mt-1 font-mono text-2xl font-semibold">{projects.length}</p></div><div><p className="text-xs text-muted-foreground">Material lots</p><p className="mt-1 font-mono text-2xl font-semibold">{lots.length}</p></div><div><p className="text-xs text-muted-foreground">Known packages</p><p className="mt-1 font-mono text-2xl font-semibold">{knownPackages}</p>{unknownLots ? <p className="text-xs text-muted-foreground">+ {unknownLots} unknown lot{unknownLots === 1 ? "" : "s"}</p> : null}</div></CardContent></Card>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_19rem]">
      <Card><CardHeader><CardTitle>Location lot ledger</CardTitle><CardDescription>Every physical lot assigned here, including its exact or unresolved position.</CardDescription></CardHeader><CardContent>{lots.length ? <LotLedger lots={lots} snapshot={snapshot} /> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">This location is available for assignment.</p>}</CardContent></Card>
      <aside className="flex flex-col gap-6"><Card><CardHeader><CardTitle>Projects inside</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{projects.map((project) => <Link key={project.id} href={`/inventory/projects/${project.slug}`} className="flex min-h-12 items-center gap-2 rounded-lg border p-3 hover:bg-muted"><span className="min-w-0 flex-1"><span className="block truncate font-medium">{project.name}</span><StatusBadge status={project.status} className="mt-1" /></span><ArrowUpRight aria-hidden="true" /></Link>)}</CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin aria-hidden="true" />Location notes</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{location.notes}</p></CardContent></Card></aside>
    </div>
  </div>
}
