"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { HardHat, UserRoundCheck, XCircle } from "lucide-react"
import { useState, type FormEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { executeFieldWorkCommand, loadFieldWorkSnapshot } from "@/features/field-work/services/remote-field-work-service"
import type { OutboundBatch } from "@/features/inventory/domain/inventory"

export function FieldAssignmentAction({ batch, projectName }: { batch: OutboundBatch; projectName: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const query = useQuery({ queryKey: ["field-work"], queryFn: loadFieldWorkSnapshot, enabled: open })
  const assignment = query.data?.assignments.find((item) => item.outboundBatchId === batch.id && item.status !== "Cancelled")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    const form = new FormData(event.currentTarget)
    try {
      const techUserId = String(form.get("techUserId") ?? "")
      if (assignment) {
        if (techUserId !== assignment.assignedTechId) {
          await executeFieldWorkCommand(crypto.randomUUID(), "field.assignment.reassign", batch.siteId, { assignmentId: assignment.id, expectedVersion: assignment.version, techUserId })
        }
      } else {
        const dueDate = String(form.get("dueDate") ?? "")
        await executeFieldWorkCommand(crypto.randomUUID(), "field.assignment.create", batch.siteId, {
          outboundBatchId: batch.id,
          techUserId,
          dueAt: dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null,
          note: String(form.get("note") ?? ""),
        })
      }
      await queryClient.invalidateQueries({ queryKey: ["field-work"] })
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The field assignment could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  async function cancel() {
    if (!assignment) return
    setSaving(true)
    setError("")
    try {
      await executeFieldWorkCommand(crypto.randomUUID(), "field.assignment.cancel", batch.siteId, { assignmentId: assignment.id, expectedVersion: assignment.version, note: "Assignment cancelled by Operator." })
      await queryClient.invalidateQueries({ queryKey: ["field-work"] })
      setOpen(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The field assignment could not be cancelled.")
    } finally {
      setSaving(false)
    }
  }

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button variant="outline" size="lg" />}>
      <HardHat aria-hidden="true" data-icon="inline-start" />{assignment ? "Assigned work" : "Assign Tech"}
    </SheetTrigger>
    <SheetContent className="w-full sm:max-w-lg">
      <SheetHeader className="border-b">
        <SheetTitle>{assignment ? "Manage field assignment" : "Assign installation work"}</SheetTitle>
        <SheetDescription>{projectName} · {batch.state} outbound material</SheetDescription>
      </SheetHeader>
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="flex-1 overflow-y-auto p-4">
          <FieldGroup>
            {assignment ? <div className="rounded-xl border bg-muted/35 p-4"><div className="flex items-center justify-between gap-2"><p className="font-semibold">{assignment.assignedTechName}</p><Badge variant="outline">{assignment.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">Assigned by {assignment.assignedByName}</p></div> : null}
            <Field>
              <FieldLabel htmlFor={`field-tech-${batch.id}`}>Tech account</FieldLabel>
              <NativeSelect id={`field-tech-${batch.id}`} name="techUserId" defaultValue={assignment?.assignedTechId ?? ""} required disabled={query.isLoading || !query.data?.techs.length}>
                <NativeSelectOption value="">{query.isLoading ? "Loading Tech accounts…" : "Select Tech"}</NativeSelectOption>
                {query.data?.techs.map((tech) => <NativeSelectOption key={tech.id} value={tech.id}>{tech.displayName}</NativeSelectOption>)}
              </NativeSelect>
              {!query.isLoading && !query.data?.techs.length ? <FieldDescription>Create and activate a Tech account in Account access first.</FieldDescription> : null}
            </Field>
            {!assignment ? <>
              <Field><FieldLabel htmlFor={`field-due-${batch.id}`}>Due date</FieldLabel><Input id={`field-due-${batch.id}`} name="dueDate" type="date" /></Field>
              <Field><FieldLabel htmlFor={`field-note-${batch.id}`}>Assignment note</FieldLabel><Textarea id={`field-note-${batch.id}`} name="note" placeholder="Pickup, destination, access, or installation context" /></Field>
            </> : null}
            {query.error ? <FieldError>{query.error.message}</FieldError> : null}
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
        </div>
        <SheetFooter className="border-t sm:justify-between">
          {assignment && assignment.status !== "Completed" ? <Button type="button" variant="outline" size="lg" disabled={saving} onClick={cancel}><XCircle aria-hidden="true" />Cancel assignment</Button> : <span />}
          <Button type="submit" size="lg" disabled={saving || query.isLoading || !query.data?.techs.length}><UserRoundCheck aria-hidden="true" />{saving ? "Saving…" : assignment ? "Save assignment" : "Assign work"}</Button>
        </SheetFooter>
      </form>
    </SheetContent>
  </Sheet>
}
