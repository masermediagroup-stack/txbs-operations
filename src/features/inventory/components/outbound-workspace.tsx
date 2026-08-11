"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState, type FormEvent } from "react"
import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, PackageCheck, RotateCcw, Truck, XCircle } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { RecordIssueSheet } from "@/features/inventory/components/issue-actions"
import type { InventorySnapshot, MaterialLot, OutboundBatch } from "@/features/inventory/domain/inventory"
import { describePosition, lotVerificationState, projectLots, projectReadiness, reservedOutboundQuantity } from "@/features/inventory/domain/selectors"

const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

function mutationId(action: string) {
  return `${action}-${crypto.randomUUID()}`
}

function stateVariant(state: OutboundBatch["state"]) {
  if (state === "Departed") return "secondary" as const
  if (state === "Cancelled") return "outline" as const
  if (state === "Ready") return "default" as const
  return "outline" as const
}

function BatchActionSheet({ batch, action }: { batch: OutboundBatch; action: "ready" | "depart" | "cancel" | "reverse" }) {
  const { markOutboundReady, departOutboundBatch, cancelOutboundBatch, reverseOutboundBatch } = useInventory()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const labels = {
    ready: { trigger: "Mark ready", title: "Confirm outbound readiness", description: "Confirm the selected lots are verified and no blocking issue remains.", submit: "Mark batch ready", icon: CheckCircle2 },
    depart: { trigger: "Record departure", title: "Record material departure", description: "Confirm the final count and preserve pickup evidence. A photo is optional.", submit: "Record departure", icon: Truck },
    cancel: { trigger: "Cancel batch", title: "Cancel outbound batch", description: "Release the reserved material while preserving the planning history.", submit: "Cancel batch", icon: XCircle },
    reverse: { trigger: "Reverse departure", title: "Reverse outbound departure", description: "Restore unchanged departed material with a compensating history record.", submit: "Reverse departure", icon: RotateCcw },
  } as const
  const label = labels[action]
  const Icon = label.icon

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const operatorName = String(form.get("operatorName") ?? "")
    const note = String(form.get("note") ?? "")
    try {
      if (action === "ready") await markOutboundReady({ batchId: batch.id, operatorName, clientMutationId: mutationId("outbound-ready") })
      if (action === "cancel") await cancelOutboundBatch({ batchId: batch.id, operatorName, note, clientMutationId: mutationId("outbound-cancel") })
      if (action === "reverse") await reverseOutboundBatch({ batchId: batch.id, operatorName, note, clientMutationId: mutationId("outbound-reverse") })
      if (action === "depart") {
        const item = form.get("proofPhoto")
        await departOutboundBatch({
          batchId: batch.id,
          operatorName,
          note,
          carrierReference: String(form.get("carrierReference") ?? ""),
          driverReference: String(form.get("driverReference") ?? ""),
          file: item instanceof File && item.size ? item : null,
          clientMutationId: mutationId("outbound-depart"),
        })
      }
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The outbound action could not be completed.")
    } finally {
      setSaving(false)
    }
  }

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button variant={action === "depart" || action === "ready" ? "default" : "outline"} size="lg" />}><Icon aria-hidden="true" data-icon="inline-start" />{label.trigger}</SheetTrigger>
    <SheetContent className="w-full sm:max-w-lg">
      <SheetHeader className="border-b"><SheetTitle>{label.title}</SheetTitle><SheetDescription>{label.description}</SheetDescription></SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="flex-1 overflow-y-auto p-4">
          <FieldGroup>
            {action === "depart" ? <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field><FieldLabel htmlFor={`carrier-${batch.id}`}>Carrier reference</FieldLabel><Input id={`carrier-${batch.id}`} name="carrierReference" /></Field>
                <Field><FieldLabel htmlFor={`driver-${batch.id}`}>Driver reference</FieldLabel><Input id={`driver-${batch.id}`} name="driverReference" /></Field>
              </div>
              <Field><FieldLabel htmlFor={`photo-${batch.id}`}><Camera aria-hidden="true" data-icon="inline-start" />Proof photo</FieldLabel><Input id={`photo-${batch.id}`} name="proofPhoto" type="file" accept="image/*" capture="environment" /><FieldDescription>Optional. Only Receiving requires material photos.</FieldDescription></Field>
            </> : null}
            {action !== "ready" ? <Field><FieldLabel htmlFor={`note-${action}-${batch.id}`}>{action === "depart" ? "Departure note" : "Reason / note"}</FieldLabel><Textarea id={`note-${action}-${batch.id}`} name="note" /></Field> : null}
            <Field><FieldLabel htmlFor={`operator-${action}-${batch.id}`}>Operator name</FieldLabel><Input id={`operator-${action}-${batch.id}`} name="operatorName" required autoComplete="name" /></Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
        </div>
        <SheetFooter className="border-t"><Button type="submit" size="lg" disabled={saving}>{saving ? "Working…" : label.submit}</Button></SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
}

function BatchCard({ batch, snapshot }: { batch: OutboundBatch; snapshot: InventorySnapshot }) {
  const project = snapshot.projects.find((item) => item.id === batch.projectId)
  const lines = snapshot.outboundLines.filter((line) => line.batchId === batch.id)
  const reversed = snapshot.outboundBatches.some((item) => item.reversalOfBatchId === batch.id)
  const total = lines.filter((line) => line.quantity !== null).reduce((sum, line) => sum + (line.quantity ?? 0), 0)
  const unknown = lines.filter((line) => line.quantity === null).length

  return <Card size="sm">
    <CardHeader className="border-b">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><CardTitle>{project ? <Link href={`/inventory/projects/${project.slug}`} className="hover:text-primary hover:underline">{project.name}</Link> : "Outbound batch"}</CardTitle><Badge variant={stateVariant(batch.state)}>{batch.state}</Badge>{reversed ? <Badge variant="outline">Reversed</Badge> : null}</div>
          <CardDescription>{lines.length} selected lot{lines.length === 1 ? "" : "s"} · {total} known package{total === 1 ? "" : "s"}{unknown ? ` + ${unknown} unknown` : ""} · {formatter.format(new Date(batch.plannedAt))}</CardDescription>
        </div>
        <p className="text-xs text-muted-foreground">Planned by {batch.operatorName}</p>
      </div>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="bg-muted/55 text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Material</th><th className="px-3 py-2 font-medium">Source</th><th className="px-3 py-2 font-medium">Selected</th><th className="px-3 py-2 font-medium">Remaining now</th></tr></thead>
          <tbody>{lines.map((line) => { const lot = snapshot.lots.find((item) => item.id === line.sourceLotId); const location = snapshot.locations.find((item) => item.id === line.sourceLocationId); const fullDeparted = batch.state === "Departed" && line.resultingLotId === line.sourceLotId; return <tr key={line.id} className="border-t"><td className="px-3 py-2"><p className="font-medium">{line.materialName}</p>{line.handlingRequirements.length ? <p className="text-xs text-muted-foreground">{line.handlingRequirements.join(" · ")}</p> : null}</td><td className="px-3 py-2"><p>{location?.name ?? "Unknown"}</p><p className="text-xs text-muted-foreground">{describePosition(line.sourcePosition)}</p></td><td className="px-3 py-2 font-mono tabular-nums">{line.quantity ?? "Unknown / full"}</td><td className="px-3 py-2 font-mono tabular-nums">{fullDeparted ? 0 : lot?.presence === "Present" ? lot.quantity ?? "Unknown" : 0}</td></tr> })}</tbody>
        </table>
      </div>
      {batch.state === "Departed" && (batch.carrierReference || batch.driverReference || batch.note) ? <p className="text-xs text-muted-foreground">{[batch.carrierReference && `Carrier: ${batch.carrierReference}`, batch.driverReference && `Driver: ${batch.driverReference}`, batch.note].filter(Boolean).join(" · ")}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <RecordIssueSheet projectId={batch.projectId} outboundBatchId={batch.id} size="sm" />
        {batch.state === "Planned" ? <BatchActionSheet batch={batch} action="ready" /> : null}
        {batch.state === "Ready" ? <BatchActionSheet batch={batch} action="depart" /> : null}
        {batch.state === "Planned" || batch.state === "Ready" ? <BatchActionSheet batch={batch} action="cancel" /> : null}
        {batch.state === "Departed" && !reversed ? <BatchActionSheet batch={batch} action="reverse" /> : null}
      </div>
    </CardContent>
  </Card>
}

function LotSelection({ lot, snapshot, surface, checked, selectedQuantity, onToggle, onQuantityChange }: { lot: MaterialLot; snapshot: InventorySnapshot; surface: "desktop" | "mobile"; checked: boolean; selectedQuantity: string | undefined; onToggle(checked: boolean): void; onQuantityChange(value: string): void }) {
  const group = snapshot.groups.find((item) => item.id === lot.groupId)
  const location = snapshot.locations.find((item) => item.id === lot.locationId)
  const verification = lotVerificationState(snapshot, lot)
  const reservation = reservedOutboundQuantity(snapshot, lot)
  const reserved = reservation === null || reservation > 0
  const quantityId = `outbound-quantity-${surface}-${lot.id}`

  return <>
    <label className="flex min-h-11 items-center gap-2 font-medium"><input type="checkbox" className="size-4" aria-label={`Select ${group?.name ?? "material lot"}`} checked={checked} disabled={reserved} onChange={(event) => onToggle(event.target.checked)} />{group?.name ?? "Material lot"}</label>
    <div><p className="font-mono font-semibold tabular-nums">{lot.quantity ?? "Unknown"}</p><p className="text-xs text-muted-foreground">{lot.packageType}</p></div>
    <div><p>{location?.name ?? "Unknown location"}</p><p className="text-xs text-muted-foreground">{describePosition(lot.position)}</p></div>
    <div className="flex flex-wrap gap-1.5"><Badge variant={verification.label === "Verified" ? "secondary" : "outline"}>{verification.label}</Badge><Badge variant="outline">{lot.condition}</Badge>{reserved ? <Badge variant="destructive">Reserved</Badge> : null}</div>
    <Field className="gap-1"><FieldLabel className="sr-only" htmlFor={quantityId}>Outbound quantity for {group?.name ?? "material lot"}</FieldLabel><Input id={quantityId} type="number" min="1" max={lot.quantity ?? undefined} step="1" inputMode="numeric" value={selectedQuantity ?? ""} disabled={!checked || lot.quantity === null} placeholder={lot.quantity === null ? "Full unknown lot" : "Quantity"} onChange={(event) => onQuantityChange(event.target.value)} /></Field>
  </>
}

export function OutboundWorkspace() {
  const searchParams = useSearchParams()
  const { snapshot, createOutboundBatch } = useInventory()
  const initialProjectId = searchParams.get("project") ?? ""
  const initialLotId = searchParams.get("lot") ?? ""
  const [projectId, setProjectId] = useState(initialProjectId)
  const [selected, setSelected] = useState<Record<string, string>>(() => initialLotId ? { [initialLotId]: "" } : {})
  const [operatorName, setOperatorName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const lots = projectId ? projectLots(snapshot, projectId) : []
  const readiness = projectId ? projectReadiness(snapshot, projectId) : null
  const selectedLots = lots.filter((lot) => lot.id in selected)
  const handlingRequirements = [...new Set(selectedLots.flatMap((lot) => lot.handlingRequirements))]
  const activeBatches = snapshot.outboundBatches.filter((batch) => batch.state === "Planned" || batch.state === "Ready").toSorted((a, b) => Date.parse(b.plannedAt) - Date.parse(a.plannedAt))
  const history = snapshot.outboundBatches.filter((batch) => batch.state !== "Planned" && batch.state !== "Ready").toSorted((a, b) => Date.parse(b.departedAt ?? b.cancelledAt ?? b.reversedAt ?? b.plannedAt) - Date.parse(a.departedAt ?? a.cancelledAt ?? a.reversedAt ?? a.plannedAt))
  const summary = { planned: snapshot.outboundBatches.filter((batch) => batch.state === "Planned").length, ready: snapshot.outboundBatches.filter((batch) => batch.state === "Ready").length, departed: snapshot.outboundBatches.filter((batch) => batch.state === "Departed").length }

  function toggleLot(lot: MaterialLot, checked: boolean) {
    setSelected((current) => {
      const next = { ...current }
      if (checked) next[lot.id] = lot.quantity === null ? "" : String(lot.quantity)
      else delete next[lot.id]
      return next
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")
    try {
      await createOutboundBatch({
        projectId,
        operatorName,
        clientMutationId: mutationId("outbound-plan"),
        lines: selectedLots.map((lot) => ({ lotId: lot.id, quantity: lot.quantity === null ? null : Number(selected[lot.id]), expectedVersion: lot.version })),
      })
      setSelected({})
      setMessage(`${selectedLots.length} material lot${selectedLots.length === 1 ? "" : "s"} reserved in a planned outbound batch.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The outbound batch could not be planned.")
    } finally {
      setSaving(false)
    }
  }

  return <div className="flex flex-1 flex-col gap-6">
    <PageHeader eyebrow="Inventory" title="Outbound material" description="Prepare, confirm, and record project material leaving the yard without losing what remains." />
    <div className="grid gap-3 sm:grid-cols-3">
      <Card size="sm"><CardContent><p className="text-xs text-muted-foreground">Planned batches</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{summary.planned}</p></CardContent></Card>
      <Card size="sm"><CardContent><p className="text-xs text-muted-foreground">Ready for pickup</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{summary.ready}</p></CardContent></Card>
      <Card size="sm"><CardContent><p className="text-xs text-muted-foreground">Departed batches</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{summary.departed}</p></CardContent></Card>
    </div>

    <form onSubmit={submit}>
      <Card>
        <CardHeader className="relative border-b">
          <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" />
          <CardTitle className="text-xl">Prepare outbound material</CardTitle>
          <CardDescription>Select one project&apos;s present lots, confirm quantities, and reserve them for pickup.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field><FieldLabel htmlFor="outbound-project">Project</FieldLabel><NativeSelect className="w-full sm:max-w-md" id="outbound-project" value={projectId} onChange={(event) => { setProjectId(event.target.value); setSelected({}); setMessage(""); setError("") }} required><NativeSelectOption value="">Select project</NativeSelectOption>{snapshot.projects.map((project) => <NativeSelectOption key={project.id} value={project.id}>{project.name}</NativeSelectOption>)}</NativeSelect></Field>
          {readiness ? <Alert><ClipboardCheck aria-hidden="true" /><AlertTitle>Project readiness: {readiness.status}</AlertTitle><AlertDescription>{readiness.reasons.length ? readiness.reasons.join(" ") : "All present lots are verified and no blocking issue is open."}</AlertDescription></Alert> : null}
          {projectId ? <>
            <div className="hidden overflow-x-auto rounded-xl border lg:block"><div className="grid min-w-[64rem] grid-cols-[minmax(15rem,1.3fr)_7rem_minmax(12rem,1fr)_minmax(13rem,1fr)_10rem] gap-3 bg-muted/55 px-4 py-2 text-xs font-medium text-muted-foreground"><span>Material</span><span>On site</span><span>Location</span><span>Readiness</span><span>Outbound quantity</span></div>{lots.map((lot) => <div key={lot.id} className="grid min-w-[64rem] grid-cols-[minmax(15rem,1.3fr)_7rem_minmax(12rem,1fr)_minmax(13rem,1fr)_10rem] items-center gap-3 border-t px-4 py-3"><LotSelection lot={lot} snapshot={snapshot} surface="desktop" checked={lot.id in selected} selectedQuantity={selected[lot.id]} onToggle={(checked) => toggleLot(lot, checked)} onQuantityChange={(value) => setSelected((current) => ({ ...current, [lot.id]: value }))} /></div>)}</div>
            <div className="flex flex-col gap-3 lg:hidden">{lots.map((lot) => <article key={lot.id} className="grid gap-3 rounded-xl border p-4"><LotSelection lot={lot} snapshot={snapshot} surface="mobile" checked={lot.id in selected} selectedQuantity={selected[lot.id]} onToggle={(checked) => toggleLot(lot, checked)} onQuantityChange={(value) => setSelected((current) => ({ ...current, [lot.id]: value }))} /></article>)}</div>
            {!lots.length ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No present material lots are available for this project.</p> : null}
          </> : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Select a project to review material available for outbound.</p>}
          {handlingRequirements.length ? <Alert><AlertTriangle aria-hidden="true" /><AlertTitle>Handling requirements</AlertTitle><AlertDescription>{handlingRequirements.join(" · ")}</AlertDescription></Alert> : null}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><Field><FieldLabel htmlFor="outbound-operator">Operator name</FieldLabel><Input id="outbound-operator" value={operatorName} onChange={(event) => setOperatorName(event.target.value)} required autoComplete="name" /><FieldDescription>Required to reserve material before authentication launches.</FieldDescription></Field><div className="sticky bottom-2 rounded-xl bg-card pt-1"><Button type="submit" size="lg" className="h-11 w-full sm:w-auto" disabled={saving || !projectId || !selectedLots.length}><PackageCheck aria-hidden="true" data-icon="inline-start" />{saving ? "Planning…" : `Plan ${selectedLots.length || "selected"} lot${selectedLots.length === 1 ? "" : "s"}`}</Button></div></div>
          {error ? <FieldError>{error}</FieldError> : null}
          {message ? <Alert><CheckCircle2 aria-hidden="true" /><AlertTitle>Outbound batch planned</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
        </CardContent>
      </Card>
    </form>

    <section className="flex flex-col gap-3" aria-labelledby="outbound-queue-heading"><div><h2 id="outbound-queue-heading" className="font-semibold">Active outbound queue</h2><p className="text-sm text-muted-foreground">Planned reservations and batches ready for pickup.</p></div>{activeBatches.length ? activeBatches.map((batch) => <BatchCard key={batch.id} batch={batch} snapshot={snapshot} />) : <p className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">No planned or ready outbound batches.</p>}</section>
    <section className="flex flex-col gap-3" aria-labelledby="outbound-history-heading"><div><h2 id="outbound-history-heading" className="font-semibold">Outbound history</h2><p className="text-sm text-muted-foreground">Departures, cancellations, and compensating reversals remain visible.</p></div>{history.length ? history.map((batch) => <BatchCard key={batch.id} batch={batch} snapshot={snapshot} />) : <p className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">No outbound history has been recorded on this device.</p>}</section>
  </div>
}
