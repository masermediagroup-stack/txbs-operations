"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, Boxes, CheckCircle2, Clock3, HardHat, MapPin, PackageCheck, Play, Search, WifiOff } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"

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
import type { FieldAssignment, InstallationOutcome } from "@/features/field-work/domain/field-work"
import { executeFieldWorkCommand, loadFieldWorkSnapshot, stageFieldPhotos } from "@/features/field-work/services/remote-field-work-service"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { PhotoUploadSlots } from "@/features/inventory/components/photo-upload-slots"
import { useMobileSync } from "@/features/mobile/components/mobile-sync-provider"

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

function assignmentVariant(status: FieldAssignment["status"]) {
  if (status === "Completed") return "secondary" as const
  if (status === "Blocked") return "destructive" as const
  return "outline" as const
}

function InstallationSheet({ assignment }: { assignment: FieldAssignment }) {
  const { snapshot } = useInventory()
  const { isOnline, queueCommand } = useMobileSync()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [outcome, setOutcome] = useState<InstallationOutcome>("Installed")
  const [issueType, setIssueType] = useState("")
  const lines = snapshot.outboundLines.filter((line) => line.batchId === assignment.outboundBatchId)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const form = new FormData(event.currentTarget)
    const files = form.getAll("installationPhotos").filter((item): item is File => item instanceof File && item.size > 0)
    if (files.length > 3) {
      setError("Select no more than 3 photos.")
      setSaving(false)
      return
    }
    if (issueType === "Damaged" && files.length === 0) {
      setError("Damaged field Issues require at least one photo.")
      setSaving(false)
      return
    }
    const commandId = crypto.randomUUID()
    const linePayload = lines.map((line) => ({ outboundLineId: line.id, installedQuantity: Number(form.get(`installed-${line.id}`) ?? 0) }))
    const issue = issueType ? {
      type: issueType,
      priority: issueType === "Damaged" || issueType === "Missing" ? "High" : "Normal",
      title: String(form.get("issueTitle") ?? `${issueType} during installation`),
      description: String(form.get("issueDescription") ?? ""),
    } : null
    const notes = String(form.get("notes") ?? "")

    try {
      if (isOnline) {
        const photoUploads = await stageFieldPhotos(commandId, assignment.siteId, files, notes || "Installation evidence")
        await executeFieldWorkCommand(commandId, "field.installation.confirm", assignment.siteId, { assignmentId: assignment.id, expectedVersion: assignment.version, outcome, notes, lines: linePayload, photoUploads, issue })
        await queryClient.invalidateQueries({ queryKey: ["field-work"] })
      } else {
        await queueCommand({ clientMutationId: commandId, commandType: "field.installation.confirm", siteId: assignment.siteId, entityIds: [assignment.id], entityBaseVersions: { [assignment.id]: assignment.version }, payload: { assignmentId: assignment.id, expectedVersion: assignment.version, outcome, notes, lines: linePayload, photoUploads: files, issue } })
      }
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Installation confirmation could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button size="lg" className="w-full sm:w-auto" />}><CheckCircle2 aria-hidden="true" />Confirm installation</SheetTrigger>
    <SheetContent className="w-full sm:max-w-xl">
      <SheetHeader className="border-b"><SheetTitle>Confirm installation</SheetTitle><SheetDescription>Record installed quantities and preserve field evidence for this outbound handoff.</SheetDescription></SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="flex-1 overflow-y-auto p-4"><FieldGroup>
          <Field><FieldLabel htmlFor={`outcome-${assignment.id}`}>Completion outcome</FieldLabel><NativeSelect id={`outcome-${assignment.id}`} value={outcome} onChange={(event) => setOutcome(event.target.value as InstallationOutcome)}><NativeSelectOption value="Installed">Installed</NativeSelectOption><NativeSelectOption value="Partially installed">Partially installed</NativeSelectOption><NativeSelectOption value="Blocked">Blocked</NativeSelectOption></NativeSelect></Field>
          <div className="flex flex-col gap-2"><p className="font-medium">Installed quantities</p>{lines.map((line) => <Field key={line.id} orientation="horizontal" className="items-center rounded-xl border p-3"><div className="min-w-0 flex-1"><FieldLabel htmlFor={`installed-${line.id}`}>{line.materialName}</FieldLabel><FieldDescription>{line.quantity === null ? "Delivered quantity unknown" : `${line.quantity} ${line.packageType} delivered`}</FieldDescription></div><Input id={`installed-${line.id}`} name={`installed-${line.id}`} className="w-24" type="number" min="0" max={line.quantity ?? undefined} step="1" inputMode="numeric" defaultValue={line.quantity ?? 0} required /></Field>)}</div>
          <Field><FieldLabel htmlFor={`notes-${assignment.id}`}>Installation notes</FieldLabel><Textarea id={`notes-${assignment.id}`} name="notes" placeholder="Completion, remaining work, access, or field conditions" /></Field>
          <PhotoUploadSlots id={`installation-photos-${assignment.id}`} name="installationPhotos" label="Installation photos" description="Optional. Add up to three photos from the camera or photo library." />
          <Field><FieldLabel htmlFor={`issue-${assignment.id}`}>Linked Issue</FieldLabel><NativeSelect id={`issue-${assignment.id}`} value={issueType} onChange={(event) => setIssueType(event.target.value)}><NativeSelectOption value="">No Issue</NativeSelectOption><NativeSelectOption value="Damaged">Damaged</NativeSelectOption><NativeSelectOption value="Missing">Missing</NativeSelectOption><NativeSelectOption value="Wrong project">Wrong material / project</NativeSelectOption><NativeSelectOption value="Blocked access">Blocked access</NativeSelectOption></NativeSelect><FieldDescription>Damaged material requires at least one photo.</FieldDescription></Field>
          {issueType ? <><Field><FieldLabel htmlFor={`issue-title-${assignment.id}`}>Issue title</FieldLabel><Input id={`issue-title-${assignment.id}`} name="issueTitle" required defaultValue={`${issueType} during installation`} /></Field><Field><FieldLabel htmlFor={`issue-description-${assignment.id}`}>Issue details</FieldLabel><Textarea id={`issue-description-${assignment.id}`} name="issueDescription" /></Field></> : null}
          {!isOnline ? <Alert><WifiOff aria-hidden="true" /><AlertTitle>Will be queued on this device</AlertTitle><AlertDescription>The confirmation and photo files will sync once this device reconnects.</AlertDescription></Alert> : null}
          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup></div>
        <SheetFooter className="border-t"><Button type="submit" size="lg" disabled={saving}>{saving ? "Saving…" : isOnline ? "Submit confirmation" : "Queue confirmation"}</Button></SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
}

function AssignmentCard({ assignment }: { assignment: FieldAssignment }) {
  const { snapshot } = useInventory()
  const { isOnline, queueCommand } = useMobileSync()
  const queryClient = useQueryClient()
  const [error, setError] = useState("")
  const project = snapshot.projects.find((item) => item.id === assignment.projectId)
  const lines = snapshot.outboundLines.filter((line) => line.batchId === assignment.outboundBatchId)

  async function start() {
    setError("")
    try {
      const commandId = crypto.randomUUID()
      if (isOnline) {
        await executeFieldWorkCommand(commandId, "field.assignment.start", assignment.siteId, { assignmentId: assignment.id, expectedVersion: assignment.version })
        await queryClient.invalidateQueries({ queryKey: ["field-work"] })
      } else {
        await queueCommand({ clientMutationId: commandId, commandType: "field.assignment.start", siteId: assignment.siteId, entityIds: [assignment.id], entityBaseVersions: { [assignment.id]: assignment.version }, payload: { assignmentId: assignment.id, expectedVersion: assignment.version } })
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Work could not be started.")
    }
  }

  return <Card size="sm">
    <CardHeader className="border-b"><div className="flex flex-wrap items-start justify-between gap-2"><div><CardTitle>{project?.name ?? "Assigned project"}</CardTitle><CardDescription>{lines.length} material line{lines.length === 1 ? "" : "s"}{assignment.dueAt ? ` · Due ${dateFormatter.format(new Date(assignment.dueAt))}` : ""}</CardDescription></div><Badge variant={assignmentVariant(assignment.status)}>{assignment.status}</Badge></div></CardHeader>
    <CardContent className="flex flex-col gap-4">{assignment.note ? <p className="rounded-lg bg-muted/45 p-3 text-sm">{assignment.note}</p> : null}<div className="grid gap-2">{lines.map((line) => <div key={line.id} className="flex items-start justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{line.materialName}</p>{line.handlingRequirements.length ? <p className="mt-1 text-xs text-destructive"><AlertTriangle aria-hidden="true" className="mr-1 inline size-3.5" />{line.handlingRequirements.join(" · ")}</p> : null}</div><p className="shrink-0 font-mono text-sm">{line.quantity ?? "Unknown"} {line.packageType}</p></div>)}</div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{assignment.status === "Not Started" ? <Button size="lg" variant="outline" onClick={start}><Play aria-hidden="true" />{isOnline ? "Start work" : "Queue start"}</Button> : null}{assignment.status !== "Completed" && assignment.status !== "Cancelled" ? <InstallationSheet assignment={assignment} /> : null}</div></CardContent>
  </Card>
}

export function TechWorkWorkspace({ authenticated }: { authenticated: boolean }) {
  const { snapshot, isHydrating } = useInventory()
  const [search, setSearch] = useState("")
  const fieldWork = useQuery({ queryKey: ["field-work"], queryFn: loadFieldWorkSnapshot, enabled: authenticated })
  const presentLots = snapshot.lots.filter((lot) => lot.presence === "Present")
  const filteredLots = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return presentLots.slice(0, 12)
    return presentLots.filter((lot) => {
      const project = snapshot.projects.find((item) => item.id === lot.projectId)
      const group = snapshot.groups.find((item) => item.id === lot.groupId)
      const location = snapshot.locations.find((item) => item.id === lot.locationId)
      return [project?.name, group?.name, location?.name].some((value) => value?.toLocaleLowerCase().includes(query))
    }).slice(0, 24)
  }, [presentLots, search, snapshot.groups, snapshot.locations, snapshot.projects])
  const assignments = fieldWork.data?.assignments.filter((assignment) => assignment.status !== "Cancelled") ?? []
  const assignedBatchIds = new Set(assignments.map((assignment) => assignment.outboundBatchId).filter(Boolean))
  const outbound = snapshot.outboundBatches.filter((batch) => assignedBatchIds.has(batch.id))

  return <div className="flex flex-1 flex-col gap-6">
    <PageHeader eyebrow="Field workspace" title="My Work" description="Review assigned installation work, material context, and outbound handoffs for project sites." action={<Badge variant="outline"><HardHat aria-hidden="true" data-icon="inline-start" />Tech access</Badge>} />
    <section className="flex flex-col gap-3" aria-labelledby="assigned-work-heading"><div><h2 id="assigned-work-heading" className="font-semibold">Assigned Work</h2><p className="text-sm text-muted-foreground">Start, confirm, or document work assigned by an Operator.</p></div>{!authenticated ? <Alert><Clock3 aria-hidden="true" /><AlertTitle>Sign in to load assignments</AlertTitle><AlertDescription>Assigned installation work is available from the shared demo environment after authentication.</AlertDescription></Alert> : fieldWork.isLoading ? <p className="rounded-xl border p-6 text-sm text-muted-foreground">Loading assigned work…</p> : fieldWork.error ? <Alert variant="destructive"><AlertTriangle aria-hidden="true" /><AlertTitle>Assigned work is unavailable</AlertTitle><AlertDescription>{fieldWork.error.message}</AlertDescription></Alert> : assignments.length ? assignments.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No installation work is assigned to this account.</p>}</section>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Boxes aria-hidden="true" />Read-only Inventory Search</CardTitle><CardDescription>Find pickup and installation context without changing yard records.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3"><div className="relative"><Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search project, material, or location" /></div><div className="grid gap-2">{filteredLots.map((lot) => { const project = snapshot.projects.find((item) => item.id === lot.projectId); const group = snapshot.groups.find((item) => item.id === lot.groupId); const site = snapshot.sites.find((item) => item.id === lot.siteId); const location = snapshot.locations.find((item) => item.id === lot.locationId); return <div key={lot.id} className="grid gap-1 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-medium">{group?.name ?? "Material"}</p><p className="text-sm text-muted-foreground">{project?.name ?? "Unknown project"} · {site?.name ?? "Unknown site"}</p></div><p className="text-sm"><MapPin aria-hidden="true" className="mr-1 inline size-3.5" />{location?.name ?? "Unknown"} · <span className="font-mono">{lot.quantity ?? "Unknown"} {lot.packageType}</span></p></div>})}</div>{!filteredLots.length && !isHydrating ? <p className="p-5 text-center text-sm text-muted-foreground">No material matches this search.</p> : null}</CardContent></Card>
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><PackageCheck aria-hidden="true" />Relevant Outbound context</CardTitle><CardDescription>Handoffs connected to your assigned installation work.</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">{outbound.length ? outbound.map((batch) => { const project = snapshot.projects.find((item) => item.id === batch.projectId); const lines = snapshot.outboundLines.filter((line) => line.batchId === batch.id); return <div key={batch.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{project?.name ?? "Outbound batch"}</p><p className="text-sm text-muted-foreground">{lines.map((line) => line.materialName).join(" · ") || "Material details pending"}</p></div><Badge variant={batch.state === "Ready" ? "default" : "outline"}>{batch.state}</Badge></div> }) : <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Outbound context appears after work is assigned.</p>}</CardContent></Card>
  </div>
}
