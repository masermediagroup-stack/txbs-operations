"use client"

import Link from "next/link"
import { useDeferredValue, useState, useSyncExternalStore } from "react"
import { MapPin, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { StatusBadge } from "@/features/inventory/components/status-badge"
import { projectLots, projectPackageTotal, searchInventory } from "@/features/inventory/domain/selectors"

type ProjectSort = "recent" | "name" | "packages"
const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
const subscribeToHydration = () => () => undefined

export function ProjectFinder({ heading = "Active Projects", initialQuery = "" }: { heading?: string; initialQuery?: string }) {
  const { snapshot, isHydrating } = useInventory()
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState("all")
  const [locationId, setLocationId] = useState("all")
  const [sort, setSort] = useState<ProjectSort>("recent")
  const isInteractive = useSyncExternalStore(subscribeToHydration, () => true, () => false)
  const deferredQuery = useDeferredValue(query)
  const projects = searchInventory(snapshot, deferredQuery)
    .filter(({ project }) => status === "all" || project.status === status)
    .filter(({ project }) => locationId === "all" || projectLots(snapshot, project.id).some((lot) => lot.locationId === locationId))
    .toSorted((a, b) => sort === "name" ? a.project.name.localeCompare(b.project.name) : sort === "packages" ? projectPackageTotal(snapshot, b.project.id).known - projectPackageTotal(snapshot, a.project.id).known : Date.parse(b.project.updatedAt) - Date.parse(a.project.updatedAt))

  return <section className="flex flex-col gap-5" aria-labelledby="project-finder-heading">
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_13rem]">
        <div className="flex flex-col gap-5 p-5 sm:p-7"><div><h2 id="project-finder-heading" className="text-xl font-semibold tracking-tight sm:text-2xl">Project Material Locator</h2><p className="mt-1.5 text-sm text-muted-foreground">Search project names, aliases, handwritten field labels, POs, job numbers, materials, or storage.</p></div><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search inventory project materials" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects and field labels" className="h-13 rounded-xl pr-12 pl-12 text-base md:text-base" disabled={!isInteractive} />{query ? <Button type="button" variant="ghost" size="icon" onClick={() => setQuery("")} aria-label="Clear inventory search" className="absolute top-1/2 right-2 -translate-y-1/2"><X aria-hidden="true" /></Button> : null}</div></div>
        <dl className="flex items-center border-t-4 border-t-brand-orange px-5 py-4 lg:border-t-0 lg:border-l-4 lg:border-l-brand-orange"><div><dt className="text-xs font-medium text-muted-foreground">Projects on site</dt><dd className="mt-1 font-mono text-3xl font-semibold tabular-nums">{snapshot.projects.length}</dd>{isHydrating ? <p className="text-xs text-muted-foreground">Loading saved records…</p> : null}</div></dl>
      </div>
    </div>
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div><h2 id="active-projects-heading" className="font-semibold">{heading}</h2><p className="text-sm text-muted-foreground" aria-live="polite">{projects.length} {projects.length === 1 ? "project" : "projects"} with inventory records</p></div><div className="grid gap-2 sm:grid-cols-3"><NativeSelect aria-label="Filter by project status" className="w-full" value={status} onChange={(event) => setStatus(event.target.value)}><NativeSelectOption value="all">All statuses</NativeSelectOption>{[...new Set(snapshot.projects.map((project) => project.status))].map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect><NativeSelect aria-label="Filter by storage location" className="w-full" value={locationId} onChange={(event) => setLocationId(event.target.value)}><NativeSelectOption value="all">All locations</NativeSelectOption>{snapshot.locations.map((location) => <NativeSelectOption key={location.id} value={location.id}>{location.name}</NativeSelectOption>)}</NativeSelect><NativeSelect aria-label="Sort projects" className="w-full" value={sort} onChange={(event) => setSort(event.target.value as ProjectSort)}><NativeSelectOption value="recent">Recent activity</NativeSelectOption><NativeSelectOption value="name">Project name</NativeSelectOption><NativeSelectOption value="packages">Most packages</NativeSelectOption></NativeSelect></div></div>
    {projects.length ? <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-1">{projects.map(({ project, explanation }) => { const lots = projectLots(snapshot, project.id); const locations = snapshot.locations.filter((location) => lots.some((lot) => lot.locationId === location.id)); const total = projectPackageTotal(snapshot, project.id); return <article key={project.id} className="group relative grid gap-4 rounded-xl border bg-card p-4 shadow-xs transition hover:border-primary/30 xl:grid-cols-[minmax(14rem,1.2fr)_minmax(13rem,1fr)_minmax(12rem,1fr)_9rem] xl:items-center"><div><Link href={`/inventory/projects/${project.slug}`} className="font-semibold before:absolute before:inset-0 before:rounded-xl focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-ring">{project.name}</Link><p className="mt-0.5 text-xs text-muted-foreground">{project.jobNumber} · {project.purchaseOrders.join(" · ")}</p>{explanation ? <Badge variant="outline" className="mt-2">{explanation}</Badge> : null}</div><StatusBadge status={project.status} /><div className="flex flex-wrap gap-1.5">{locations.length ? locations.map((location) => <Link key={location.id} href={`/inventory/storage/${location.slug}`} className="relative z-10 inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium hover:bg-accent/70"><MapPin aria-hidden="true" />{location.name}</Link>) : <span className="text-sm text-muted-foreground">Location unknown</span>}</div><div><p className="font-mono text-lg font-semibold tabular-nums">{total.known}</p><p className="text-xs text-muted-foreground">known packages{total.unknownLots ? ` + ${total.unknownLots} unknown` : ""}</p><time className="mt-1 block text-xs text-muted-foreground" dateTime={project.updatedAt}>{formatter.format(new Date(project.updatedAt))}</time></div></article>})}</div> : <div className="rounded-xl border border-dashed bg-card p-10 text-center"><Search aria-hidden="true" className="mx-auto text-muted-foreground" /><h3 className="mt-3 font-medium">No project materials found</h3><p className="mt-1 text-sm text-muted-foreground">Try a project name, PO, job number, alias, material, or Conex.</p><Button variant="outline" className="mt-4" onClick={() => setQuery("")}>Clear search</Button></div>}
  </section>
}
