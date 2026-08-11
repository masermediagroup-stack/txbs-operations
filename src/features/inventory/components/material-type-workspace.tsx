"use client"

import Link from "next/link"
import { MapPin } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { LotLedger } from "@/features/inventory/components/lot-ledger"
import { materialSlug } from "@/features/inventory/components/materials-overview"

export function MaterialTypeWorkspace({ slug }: { slug: string }) {
  const { snapshot } = useInventory()
  const groups = snapshot.groups.filter((group) => materialSlug(group.name) === slug)
  const name = groups[0]?.name ?? "Material"
  const lots = snapshot.lots.filter((lot) => groups.some((group) => group.id === lot.groupId) && lot.presence === "Present")
  const projects = snapshot.projects.filter((project) => lots.some((lot) => lot.projectId === project.id))
  return <div className="flex flex-1 flex-col gap-5"><PageHeader eyebrow="Materials" title={name} description="Projects and physical lots containing this material type." /><div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_19rem]"><Card><CardHeader><CardTitle>{name}</CardTitle><CardDescription>{lots.length} active lot{lots.length === 1 ? "" : "s"} across {projects.length} project{projects.length === 1 ? "" : "s"}.</CardDescription></CardHeader><CardContent>{lots.length ? <LotLedger lots={lots} snapshot={snapshot} /> : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No active lots are available.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Projects</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{projects.map((project) => { const locations = snapshot.locations.filter((location) => lots.some((lot) => lot.projectId === project.id && lot.locationId === location.id)); return <Link key={project.id} href={`/inventory/projects/${project.slug}`} className="rounded-lg border p-3 hover:bg-muted"><span className="block font-medium">{project.name}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin aria-hidden="true" />{locations.map((location) => location.name).join(", ") || "Location unknown"}</span></Link>})}</CardContent></Card></div></div>
}
