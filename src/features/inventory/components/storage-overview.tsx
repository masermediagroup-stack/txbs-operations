"use client"

import Image from "next/image"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import type { StorageLocation } from "@/features/inventory/domain/inventory"

function StorageCard({ location }: { location: StorageLocation }) {
  const { snapshot } = useInventory()
  const lots = snapshot.lots.filter((lot) => lot.locationId === location.id && lot.presence === "Present")
  const projects = snapshot.projects.filter((project) => lots.some((lot) => lot.projectId === project.id))
  const packages = lots.reduce((total, lot) => total + (lot.quantity ?? 0), 0)
  return <Link href={`/inventory/storage/${location.slug}`} className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open ${location.name}`}><Card className="h-full transition group-hover:ring-primary/30 group-hover:shadow-sm"><CardHeader className="border-b"><span className="relative block size-14 overflow-hidden rounded-xl border bg-card"><Image src={location.type === "Conex" ? "/images/storage/conex-container-white.png" : "/images/storage/yard-area.png"} alt="" fill sizes="56px" className="object-cover" /></span><CardTitle>{location.name}</CardTitle></CardHeader><CardContent className="flex flex-col gap-4"><dl className="grid grid-cols-3 divide-x rounded-lg border bg-muted/25 text-center">{[["Projects", projects.length], ["Lots", lots.length], ["Packages", packages]].map(([label, value]) => <div key={label}><dt className="px-2 pt-2 text-[11px] text-muted-foreground">{label}</dt><dd className="px-2 pb-2 font-mono font-semibold tabular-nums">{value}</dd></div>)}</dl><div><p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Current projects</p><p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-5">{projects.length ? projects.map((project) => project.name).join(", ") : "Available for assignment"}</p></div></CardContent></Card></Link>
}

export function StorageOverview() {
  const { snapshot } = useInventory()
  return <section className="flex flex-1 flex-col gap-7" aria-labelledby="storage-heading"><div><h1 id="storage-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">Storage by site</h1><p className="mt-1 text-sm text-muted-foreground">Lavon Yard and the Richardson main-office warehouse remain distinct inventory sites.</p></div>{snapshot.sites.filter((site) => site.active).map((site) => <section key={site.id} className="flex flex-col gap-4" aria-labelledby={`site-${site.id}`}><div><h2 id={`site-${site.id}`} className="font-semibold">{site.name}</h2><p className="text-sm text-muted-foreground">{snapshot.locations.filter((location) => location.siteId === site.id).length} storage locations</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{snapshot.locations.filter((location) => location.siteId === site.id).map((location) => <StorageCard key={location.id} location={location} />)}</div></section>)}</section>
}
