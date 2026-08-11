"use client"

import Link from "next/link"
import { Activity } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInventory } from "@/features/inventory/components/inventory-provider"

const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

export function ActivityOverview() {
  const { snapshot } = useInventory()
  const events = snapshot.activities.toSorted((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
  return <div className="flex flex-1 flex-col gap-6"><PageHeader eyebrow="Inventory" title="Activity" description="Append-only receiving, verification, movement, outbound, photo, location, and issue history." /><Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity aria-hidden="true" />Inventory timeline</CardTitle><CardDescription>{events.length} durable events; operator names are preserved before authentication.</CardDescription></CardHeader><CardContent><ol className="flex flex-col gap-2">{events.slice(0, 50).map((event) => { const project = snapshot.projects.find((item) => item.id === event.projectId); return <li key={event.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[8rem_minmax(0,1fr)_11rem] sm:items-center"><Badge variant="outline" className="w-fit">{event.type}</Badge><div>{project ? <Link href={`/inventory/projects/${project.slug}`} className="font-medium hover:underline">{event.description}</Link> : <p className="font-medium">{event.description}</p>}<p className="text-xs text-muted-foreground">{project?.name ?? event.entityType} · {event.operatorName}</p></div><time className="text-xs text-muted-foreground" dateTime={event.occurredAt}>{formatter.format(new Date(event.occurredAt))}</time></li>})}</ol></CardContent></Card></div>
}
