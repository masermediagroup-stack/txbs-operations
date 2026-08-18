"use client"

import { Boxes, CheckCircle2, Clock3, HardHat, MapPin, PackageCheck } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useInventory } from "@/features/inventory/components/inventory-provider"

export function TechWorkWorkspace() {
  const { snapshot, isHydrating } = useInventory()
  const presentLots = snapshot.lots.filter((lot) => lot.presence === "Present")
  const outbound = snapshot.outboundBatches
    .filter((batch) => batch.state === "Planned" || batch.state === "Ready" || batch.state === "Departed")
    .toSorted((a, b) => Date.parse(b.departedAt ?? b.plannedAt) - Date.parse(a.departedAt ?? a.plannedAt))

  return <div className="flex flex-1 flex-col gap-6">
    <PageHeader
      eyebrow="Field workspace"
      title="My Work"
      description="Review material across TBS inventory sites, follow outbound handoffs to project sites, and confirm installation when that workflow launches."
      action={<Badge variant="outline"><HardHat aria-hidden="true" data-icon="inline-start" />Tech access</Badge>}
    />

    <div className="grid gap-3 sm:grid-cols-3">
      <Card size="sm"><CardContent><p className="text-xs text-muted-foreground">Inventory sites</p><p className="mt-1 font-mono text-2xl font-semibold">{snapshot.sites.filter((site) => site.active).length}</p></CardContent></Card>
      <Card size="sm"><CardContent><p className="text-xs text-muted-foreground">Present material lots</p><p className="mt-1 font-mono text-2xl font-semibold">{presentLots.length}</p></CardContent></Card>
      <Card size="sm"><CardContent><p className="text-xs text-muted-foreground">Active outbound handoffs</p><p className="mt-1 font-mono text-2xl font-semibold">{outbound.filter((batch) => batch.state !== "Departed").length}</p></CardContent></Card>
    </div>

    <Card>
      <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Boxes aria-hidden="true" />Inventory visibility</CardTitle><CardDescription>Read-only material context for understanding what TBS has and where it is stored. Operational changes remain with Operator workflows.</CardDescription></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-muted/55 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Project</th><th className="px-4 py-3 font-medium">Material</th><th className="px-4 py-3 font-medium">Site</th><th className="px-4 py-3 font-medium">Location</th><th className="px-4 py-3 font-medium">Quantity</th></tr></thead>
            <tbody>{presentLots.map((lot) => {
              const project = snapshot.projects.find((item) => item.id === lot.projectId)
              const group = snapshot.groups.find((item) => item.id === lot.groupId)
              const site = snapshot.sites.find((item) => item.id === lot.siteId)
              const location = snapshot.locations.find((item) => item.id === lot.locationId)
              return <tr key={lot.id} className="border-t"><td className="px-4 py-3 font-medium">{project?.name ?? "Unknown project"}</td><td className="px-4 py-3">{group?.name ?? "Material"}</td><td className="px-4 py-3">{site?.name ?? "Unknown site"}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="size-3.5" />{location?.name ?? "Unknown"}</span></td><td className="px-4 py-3 font-mono">{lot.quantity ?? "Unknown"} {lot.packageType}</td></tr>
            })}</tbody>
          </table>
        </div>
        {!presentLots.length && !isHydrating ? <p className="p-6 text-center text-sm text-muted-foreground">No present inventory is available.</p> : null}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><PackageCheck aria-hidden="true" />Outbound to project sites</CardTitle><CardDescription>Planned, ready, and departed material handoffs that Techs need for field coordination.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {outbound.length ? outbound.map((batch) => {
          const project = snapshot.projects.find((item) => item.id === batch.projectId)
          const lines = snapshot.outboundLines.filter((line) => line.batchId === batch.id)
          return <div key={batch.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{project?.name ?? "Outbound batch"}</p><p className="text-sm text-muted-foreground">{lines.map((line) => line.materialName).join(" · ") || "Material details pending"}</p></div><Badge variant={batch.state === "Ready" ? "default" : "outline"}>{batch.state}</Badge></div>
        }) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No outbound handoffs have been recorded yet.</p>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="flex items-center gap-2"><CheckCircle2 aria-hidden="true" />Installation confirmation</CardTitle><Badge variant="outline"><Clock3 aria-hidden="true" data-icon="inline-start" />Planned</Badge></div><CardDescription>This will become the Tech action area for confirming delivered material was installed at the assigned job or project site.</CardDescription></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">The durable installation record will include the assigned project, delivered material, installed quantity, confirmation time, Tech identity, notes, optional completion photos, and a linked Issue when work is blocked or material is incorrect.</p></CardContent>
    </Card>
  </div>
}
