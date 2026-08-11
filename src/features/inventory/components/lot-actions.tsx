"use client"

import { useRef, useState, type FormEvent, type ReactNode } from "react"
import { Archive, Camera, CheckCircle2, PackagePlus, Upload } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { accessibilityStates, conditionStates, packageTypes, positionPrecisions, protectionStates, type MaterialLot } from "@/features/inventory/domain/inventory"
import { useInventory } from "@/features/inventory/components/inventory-provider"

function value(form: FormData, name: string) { return String(form.get(name) ?? "").trim() }
function photo(form: FormData) { const item = form.get("photo"); return item instanceof File && item.size ? item : null }

function LocationFields() {
  const { snapshot } = useInventory()
  return (
    <>
      <Field>
        <FieldLabel htmlFor="location">Storage location</FieldLabel>
        <NativeSelect className="w-full" id="location" name="locationId" defaultValue="">
          <NativeSelectOption value="">Unknown / not assigned</NativeSelectOption>
          {snapshot.locations.map((location) => <NativeSelectOption key={location.id} value={location.id}>{location.name}</NativeSelectOption>)}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field className="min-w-0 gap-1"><FieldLabel className="whitespace-nowrap" htmlFor="precision">Position</FieldLabel><NativeSelect className="w-full min-w-0" id="precision" name="precision" defaultValue="Unknown">{positionPrecisions.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
        <Field className="min-w-0 gap-1"><FieldLabel className="whitespace-nowrap" htmlFor="row">Depth</FieldLabel><NativeSelect className="w-full min-w-0" id="row" name="row" defaultValue=""><NativeSelectOption value="">Not set</NativeSelectOption>{["Front", "Middle", "Back"].map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
        <Field className="min-w-0 gap-1"><FieldLabel className="whitespace-nowrap" htmlFor="column">Side</FieldLabel><NativeSelect className="w-full min-w-0" id="column" name="column" defaultValue=""><NativeSelectOption value="">Not set</NativeSelectOption>{["Left", "Center", "Right"].map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
      </div>
      <Field><FieldLabel htmlFor="positionNote">Position note</FieldLabel><Input id="positionNote" name="positionNote" placeholder="Aisle, stack, landmark, or access note" /></Field>
    </>
  )
}

function EvidenceFields() {
  return (
    <Field>
      <FieldLabel htmlFor="photo"><Camera aria-hidden="true" data-icon="inline-start" />Photo evidence</FieldLabel>
      <Input id="photo" name="photo" type="file" accept="image/*" capture="environment" />
      <FieldDescription>Photos remain on this device and are included in backups.</FieldDescription>
    </Field>
  )
}

function ActionSheet({ trigger, title, description, children, open, onOpenChange }: { trigger: ReactNode; title: string; description: string; children: ReactNode; open: boolean; onOpenChange(open: boolean): void }) {
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetTrigger render={<Button variant="outline" />}>{trigger}</SheetTrigger><SheetContent className="w-full sm:max-w-xl"><SheetHeader className="border-b"><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader>{children}</SheetContent></Sheet>
}

export function AddMaterialSheet({ projectId }: { projectId: string }) {
  const { addMaterial } = useInventory()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaving(true)
    const form = new FormData(event.currentTarget)
    try {
      const rawQuantity = value(form, "quantity")
      await addMaterial({ projectId, operatorName: value(form, "operatorName"), materialName: value(form, "materialName"), description: value(form, "description"), packageType: value(form, "packageType") as never, quantity: rawQuantity ? Number(rawQuantity) : null, condition: value(form, "condition") as never, protection: value(form, "protection") as never, accessibility: value(form, "accessibility") as never, handlingRequirements: value(form, "handlingRequirements").split(/\r?\n|,/), locationId: value(form, "locationId") || null, precision: value(form, "precision") as never, row: (value(form, "row") || null) as never, column: (value(form, "column") || null) as never, positionNote: value(form, "positionNote"), file: photo(form), photoType: "Material" })
      setOpen(false)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Material could not be saved.") } finally { setSaving(false) }
  }

  return <ActionSheet trigger={<><PackagePlus aria-hidden="true" data-icon="inline-start" />Add project material</>} title="Add project material" description="Create one physical material lot with its current quantity, condition, and location." open={open} onOpenChange={setOpen}><form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}><div className="flex-1 overflow-y-auto p-4"><FieldGroup><Field><FieldLabel htmlFor="materialName">Material name</FieldLabel><Input id="materialName" name="materialName" required /></Field><Field><FieldLabel htmlFor="description">Description</FieldLabel><Textarea id="description" name="description" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="packageType">Package type</FieldLabel><NativeSelect className="w-full" id="packageType" name="packageType">{packageTypes.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field><Field><FieldLabel htmlFor="quantity">Quantity</FieldLabel><Input id="quantity" name="quantity" type="number" min="0" step="1" inputMode="numeric" /><FieldDescription>Leave blank when the count is unknown.</FieldDescription></Field></div><div className="grid gap-4 sm:grid-cols-3"><Field><FieldLabel htmlFor="condition">Condition</FieldLabel><NativeSelect className="w-full" id="condition" name="condition">{conditionStates.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field><Field><FieldLabel htmlFor="protection">Protection</FieldLabel><NativeSelect className="w-full" id="protection" name="protection">{protectionStates.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field><Field><FieldLabel htmlFor="accessibility">Access</FieldLabel><NativeSelect className="w-full" id="accessibility" name="accessibility">{accessibilityStates.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field></div><Field><FieldLabel htmlFor="handlingRequirements">Handling requirements</FieldLabel><Textarea id="handlingRequirements" name="handlingRequirements" placeholder="One per line, such as Keep dry" /></Field><LocationFields /><EvidenceFields /><Field><FieldLabel htmlFor="operatorName">Operator name</FieldLabel><Input id="operatorName" name="operatorName" autoComplete="name" required /></Field>{error ? <FieldError>{error}</FieldError> : null}</FieldGroup></div><SheetFooter className="border-t"><Button type="submit" size="lg" disabled={saving}>{saving ? "Saving…" : "Add material"}</Button></SheetFooter></form></ActionSheet>
}

export function VerifyLotSheet({ lot }: { lot: MaterialLot }) {
  const { verifyLot } = useInventory(); const [open, setOpen] = useState(false); const [error, setError] = useState(""); const [saving, setSaving] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); try { await verifyLot({ lotId: lot.id, operatorName: value(form, "operatorName"), locationId: value(form, "locationId") || null, precision: value(form, "precision") as never, row: (value(form, "row") || null) as never, column: (value(form, "column") || null) as never, positionNote: value(form, "positionNote"), note: value(form, "note"), file: photo(form), photoType: "Location" }); setOpen(false) } catch (cause) { setError(cause instanceof Error ? cause.message : "Verification could not be saved.") } finally { setSaving(false) } }
  return <ActionSheet trigger={<><CheckCircle2 aria-hidden="true" data-icon="inline-start" />Confirm still here</>} title="Confirm material location" description="Verify this lot is present and record its exact, general, or unknown position." open={open} onOpenChange={setOpen}><form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}><div className="flex-1 overflow-y-auto p-4"><FieldGroup><LocationFields /><Field><FieldLabel htmlFor="note">Verification note</FieldLabel><Textarea id="note" name="note" /></Field><EvidenceFields /><Field><FieldLabel htmlFor="operatorName">Operator name</FieldLabel><Input id="operatorName" name="operatorName" autoComplete="name" required /></Field>{error ? <FieldError>{error}</FieldError> : null}</FieldGroup></div><SheetFooter className="border-t"><Button type="submit" size="lg" disabled={saving}>{saving ? "Confirming…" : "Confirm still here"}</Button></SheetFooter></form></ActionSheet>
}

export function BackupSheet() {
  const { exportBackup, importBackup } = useInventory(); const inputRef = useRef<HTMLInputElement>(null); const [open, setOpen] = useState(false); const [message, setMessage] = useState("")
  async function download() { const blob = await exportBackup(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `tbs-inventory-${new Date().toISOString().slice(0, 10)}.tbsops.json`; link.click(); URL.revokeObjectURL(url); setMessage("Backup exported with record and photo checksums.") }
  async function upload(file: File | undefined) { if (!file) return; try { await importBackup(file); setMessage("Backup validated and imported.") } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Backup could not be imported.") } }
  return <ActionSheet trigger={<><Archive aria-hidden="true" data-icon="inline-start" />Local data</>} title="Local inventory backup" description="Export a portable archive before moving devices or importing into shared infrastructure." open={open} onOpenChange={setOpen}><div className="flex flex-1 flex-col gap-4 p-4"><Alert><Archive aria-hidden="true" /><AlertTitle>Records and photos stay together</AlertTitle><AlertDescription>The archive includes the versioned snapshot, original image blobs, and SHA-256 checksums.</AlertDescription></Alert><Button type="button" size="lg" onClick={download}><Archive aria-hidden="true" data-icon="inline-start" />Export backup</Button><input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => upload(event.target.files?.[0])} /><Button type="button" size="lg" variant="outline" onClick={() => inputRef.current?.click()}><Upload aria-hidden="true" data-icon="inline-start" />Import backup</Button>{message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}</div></ActionSheet>
}
