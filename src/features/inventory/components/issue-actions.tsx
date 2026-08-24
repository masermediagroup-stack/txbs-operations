"use client"

import Image from "next/image"
import { useEffect, useId, useMemo, useState, type FormEvent } from "react"
import { AlertCircle, Camera } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { issuePriorities, issueTypes, type IssueType } from "@/features/inventory/domain/inventory"

type RecordIssueSheetProps = {
  projectId?: string | null
  lotId?: string | null
  receiptId?: string | null
  locationId?: string | null
  movementId?: string | null
  outboundBatchId?: string | null
  triggerLabel?: string
  size?: "default" | "sm" | "lg"
}

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim()
}

function selectedPhoto(form: FormData) {
  const item = form.get("photo")
  return item instanceof File && item.size ? item : null
}

function PhotoPreview({ file }: { file: File | null }) {
  const url = useMemo(() => file ? URL.createObjectURL(file) : "", [file])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  if (!file || !url) return null
  return <div className="overflow-hidden rounded-xl border bg-muted/35"><Image src={url} alt="Selected damage evidence preview" width={640} height={360} unoptimized className="aspect-video w-full object-cover" /><p className="truncate px-3 py-2 text-xs text-muted-foreground">{file.name}</p></div>
}

export function RecordIssueSheet({ projectId = null, lotId = null, receiptId = null, locationId = null, movementId = null, outboundBatchId = null, triggerLabel = "Record issue", size = "default" }: RecordIssueSheetProps) {
  const { snapshot, recordIssue } = useInventory()
  const prefix = useId()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<IssueType>("Missing")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const lot = lotId ? snapshot.lots.find((item) => item.id === lotId) : null
  const receipt = receiptId ? snapshot.receipts.find((item) => item.id === receiptId) : null
  const location = locationId ? snapshot.locations.find((item) => item.id === locationId) : null
  const movement = movementId ? snapshot.movements.find((item) => item.id === movementId) : null
  const outbound = outboundBatchId ? snapshot.outboundBatches.find((item) => item.id === outboundBatchId) : null
  const linkedProjectId = projectId ?? lot?.projectId ?? receipt?.projectId ?? outbound?.projectId ?? null
  const linkedLocationId = locationId ?? lot?.locationId ?? receipt?.stagingLocationId ?? null
  const fixedContext = Boolean(projectId || lotId || receiptId || locationId || movementId || outboundBatchId)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const form = new FormData(event.currentTarget)
    const photo = selectedPhoto(form)
    if (type === "Damaged" && !photo) { setError("Add at least one damage photo before recording a Damaged Issue."); return }
    const selectedProjectId = linkedProjectId ?? (text(form, "projectId") || null)
    const project = snapshot.projects.find((item) => item.id === selectedProjectId)
    const siteId = project?.siteId ?? lot?.siteId ?? receipt?.siteId ?? location?.siteId ?? movement?.siteId ?? outbound?.siteId ?? snapshot.sites[0]?.id
    if (!siteId) { setError("An active site is required before recording an Issue."); return }
    setSaving(true)
    try {
      await recordIssue({
        siteId,
        projectId: selectedProjectId,
        lotId,
        receiptId,
        locationId: linkedLocationId,
        movementId,
        outboundBatchId,
        operatorName: text(form, "operatorName"),
        type,
        priority: text(form, "priority") as never,
        title: text(form, "title"),
        description: text(form, "description"),
        blocking: form.get("blocking") === "on",
        file: photo,
        photoType: "Condition",
        caption: text(form, "description"),
        clientMutationId: crypto.randomUUID(),
      })
      setOpen(false)
      setFile(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Issue could not be recorded.")
    } finally {
      setSaving(false)
    }
  }

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) { setError(""); setFile(null) }
  }

  return <Sheet open={open} onOpenChange={changeOpen}>
    <SheetTrigger render={<Button variant="outline" size={size} />}><AlertCircle aria-hidden="true" data-icon="inline-start" />{triggerLabel}</SheetTrigger>
    <SheetContent className="w-full sm:max-w-xl">
      <SheetHeader className="border-b"><SheetTitle>Record inventory Issue</SheetTitle><SheetDescription>Document an exception without replacing the material&apos;s condition, presence, or operational history.</SheetDescription></SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="flex-1 overflow-y-auto p-4">
          <FieldGroup>
            {fixedContext ? <Alert><AlertCircle aria-hidden="true" /><AlertTitle>Linked operational record</AlertTitle><AlertDescription>{lot ? "Material lot" : receipt ? `Receipt ${receipt.receiptNumber || "without number"}` : location ? location.name : movement ? "Material movement" : outbound ? "Outbound batch" : "Inventory project"}{linkedProjectId ? ` · ${snapshot.projects.find((item) => item.id === linkedProjectId)?.name ?? "Project"}` : ""}</AlertDescription></Alert> : <Field><FieldLabel htmlFor={`${prefix}-project`}>Project</FieldLabel><NativeSelect className="w-full" id={`${prefix}-project`} name="projectId" defaultValue=""><NativeSelectOption value="">No project / unknown shipment</NativeSelectOption>{snapshot.projects.map((project) => <NativeSelectOption key={project.id} value={project.id}>{project.name}</NativeSelectOption>)}</NativeSelect></Field>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field><FieldLabel htmlFor={`${prefix}-type`}>Issue type</FieldLabel><NativeSelect className="w-full" id={`${prefix}-type`} name="type" value={type} onChange={(event) => { setType(event.target.value as IssueType); setError("") }}>{issueTypes.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
              <Field><FieldLabel htmlFor={`${prefix}-priority`}>Priority</FieldLabel><NativeSelect className="w-full" id={`${prefix}-priority`} name="priority" defaultValue="Normal">{issuePriorities.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
            </div>
            <Field><FieldLabel htmlFor={`${prefix}-title`}>Short title</FieldLabel><Input id={`${prefix}-title`} name="title" required /></Field>
            <Field><FieldLabel htmlFor={`${prefix}-description`}>What happened</FieldLabel><Textarea id={`${prefix}-description`} name="description" /></Field>
            <Field data-invalid={type === "Damaged" && Boolean(error) && !file}>
              <FieldLabel htmlFor={`${prefix}-photo`}><Camera aria-hidden="true" data-icon="inline-start" />{type === "Damaged" ? "Damage photo" : "Photo evidence"}</FieldLabel>
              <Input id={`${prefix}-photo`} name="photo" type="file" accept="image/*" capture="environment" required={type === "Damaged"} aria-invalid={type === "Damaged" && Boolean(error) && !file} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError("") }} />
              <FieldDescription>{type === "Damaged" ? "Required. Capture the visible damage before recording this Issue." : "Optional. Photo evidence is stored with the Issue and included in backups."}</FieldDescription>
              <PhotoPreview file={file} />
            </Field>
            <Field orientation="horizontal"><input id={`${prefix}-blocking`} name="blocking" type="checkbox" className="size-4" /><FieldLabel htmlFor={`${prefix}-blocking`}>Blocks project readiness</FieldLabel></Field>
            <Field><FieldLabel htmlFor={`${prefix}-operator`}>Operator name</FieldLabel><Input id={`${prefix}-operator`} name="operatorName" required autoComplete="name" /></Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
        </div>
        <SheetFooter className="border-t"><Button type="submit" size="lg" disabled={saving}><AlertCircle aria-hidden="true" data-icon="inline-start" />{saving ? "Recording…" : "Record Issue"}</Button></SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
}
