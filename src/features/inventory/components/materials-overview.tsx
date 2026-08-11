"use client"

import Link from "next/link"
import { Boxes, ChevronRight } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { useInventory } from "@/features/inventory/components/inventory-provider"

export function materialSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }

export function MaterialsOverview() {
  const { snapshot } = useInventory()
  const materials = [...new Set(snapshot.groups.map((group) => group.name))].toSorted((a, b) => a.localeCompare(b)).map((name) => {
    const groups = snapshot.groups.filter((group) => group.name === name)
    const lots = snapshot.lots.filter((lot) => groups.some((group) => group.id === lot.groupId) && lot.presence === "Present")
    return { name, slug: materialSlug(name), projects: new Set(groups.map((group) => group.projectId)).size, lots: lots.length, knownPackages: lots.reduce((total, lot) => total + (lot.quantity ?? 0), 0), unknownLots: lots.filter((lot) => lot.quantity === null).length }
  })
  return <div className="flex flex-1 flex-col gap-5"><PageHeader eyebrow="Inventory" title="Materials" description="Select a material type to see every project and physical lot that contains it." /><Card className="gap-0 overflow-hidden py-0"><CardContent className="p-0"><ul className="divide-y" aria-label="Material types">{materials.map((material) => <li key={material.slug}><Link href={`/inventory/materials/${material.slug}`} className="group flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary"><Boxes aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{material.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{material.projects} project{material.projects === 1 ? "" : "s"} · {material.lots} lot{material.lots === 1 ? "" : "s"} · {material.knownPackages} known packages{material.unknownLots ? ` + ${material.unknownLots} unknown` : ""}</span></span><ChevronRight aria-hidden="true" className="text-muted-foreground transition-transform group-hover:translate-x-0.5" /></Link></li>)}</ul></CardContent></Card></div>
}
