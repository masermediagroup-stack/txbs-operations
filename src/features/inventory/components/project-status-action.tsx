"use client"

import { useId, useState, type FormEvent } from "react"
import { ArrowRight, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/features/inventory/components/status-badge"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { projectStatuses, type InventoryProject, type ProjectStatus } from "@/features/inventory/domain/inventory"

const stageDescriptions: Record<ProjectStatus, string> = {
  Ordered: "Material has been ordered for this project but is not yet confirmed at a TBS site.",
  Shipped: "The supplier has reported the project material shipped toward TBS.",
  Received: "Project material has arrived at a TBS site and Receiving has begun or finished.",
  Stored: "The project material is being held in TBS storage.",
  "Ready for Delivery": "The project is prepared for delivery. Outbound batches still track the exact lots and quantities.",
  Delivered: "Project material has been delivered to the customer job site.",
  Installed: "Installation work for the project is complete.",
}

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim()
}

export function ProjectStatusAction({ project }: { project: InventoryProject }) {
  const { updateProjectStatus } = useInventory()
  const prefix = useId()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<ProjectStatus>(projectStatuses.find((item) => item !== project.status) ?? project.status)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function changeOpen(next: boolean) {
    setOpen(next)
    setError("")
    if (next) setStatus(projectStatuses.find((item) => item !== project.status) ?? project.status)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSaving(true)
    const form = new FormData(event.currentTarget)
    try {
      await updateProjectStatus({
        projectId: project.id,
        status,
        expectedVersion: project.version,
        clientMutationId: crypto.randomUUID(),
        note: text(form, "note"),
        operatorName: text(form, "operatorName"),
      })
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The project stage could not be changed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <RefreshCw aria-hidden="true" data-icon="inline-start" />
        Change stage
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="relative border-b">
          <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" />
          <SheetTitle>Change project stage</SheetTitle>
          <SheetDescription>Update the project&apos;s overall operational stage without changing lot locations, verification, readiness, or Outbound records.</SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="flex-1 overflow-y-auto p-4">
            <FieldGroup>
              <Alert>
                <RefreshCw aria-hidden="true" />
                <AlertTitle>Current stage</AlertTitle>
                <AlertDescription className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={project.status} />
                  <ArrowRight aria-hidden="true" className="size-4" />
                  <StatusBadge status={status} />
                </AlertDescription>
              </Alert>
              <Field>
                <FieldLabel htmlFor={`${prefix}-status`}>New project stage</FieldLabel>
                <NativeSelect className="w-full" id={`${prefix}-status`} name="status" value={status} onChange={(event) => { setStatus(event.target.value as ProjectStatus); setError("") }}>
                  {projectStatuses.filter((item) => item !== project.status).map((item) => <NativeSelectOption key={item} value={item}>{item}</NativeSelectOption>)}
                </NativeSelect>
                <FieldDescription>{stageDescriptions[status]}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${prefix}-note`}>Change note</FieldLabel>
                <Textarea id={`${prefix}-note`} name="note" placeholder="Optional context, supplier update, or delivery note" />
                <FieldDescription>The stage change, note, operator, and time are preserved in Activity.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${prefix}-operator`}>Operator name</FieldLabel>
                <Input id={`${prefix}-operator`} name="operatorName" required autoComplete="name" />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
            </FieldGroup>
          </div>
          <SheetFooter className="border-t">
            <Button type="submit" size="lg" disabled={saving || status === project.status}>
              <RefreshCw aria-hidden="true" data-icon="inline-start" />
              {saving ? "Updating…" : `Change to ${status}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
