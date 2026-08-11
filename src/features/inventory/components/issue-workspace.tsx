"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useId, useState, type FormEvent } from "react"
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, ClipboardList, Link2, MessageSquare, UserRound } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { issueEvidenceState, isIssueActive } from "@/features/inventory/domain/selectors"
import type { Issue, IssueStatus, PhotoRecord } from "@/features/inventory/domain/inventory"

const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })

function text(form: FormData, name: string) { return String(form.get(name) ?? "").trim() }
function photo(form: FormData) { const item = form.get("photo"); return item instanceof File && item.size ? item : null }

function statusVariant(status: IssueStatus) {
  if (status === "Resolved") return "secondary" as const
  if (status === "Dismissed") return "outline" as const
  if (status === "In Progress") return "default" as const
  return "destructive" as const
}

function EvidenceImage({ record }: { record: PhotoRecord }) {
  const { getPhoto } = useInventory()
  const [url, setUrl] = useState("")
  useEffect(() => {
    let active = true
    let objectUrl = ""
    getPhoto(record.blobKey).then((blob) => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [getPhoto, record.blobKey])
  return <figure className="overflow-hidden rounded-xl border bg-muted/35">{url ? <Image src={url} alt={record.caption || `Issue evidence: ${record.fileName}`} width={640} height={420} unoptimized className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">Loading photo…</div>}<figcaption className="p-3"><p className="truncate font-medium">{record.fileName}</p><p className="mt-0.5 text-xs text-muted-foreground">{record.caption || record.type} · {record.operatorName}</p></figcaption></figure>
}

function AssignmentForm({ issue }: { issue: Issue }) {
  const { assignIssue } = useInventory()
  const prefix = useId()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); try { await assignIssue({ issueId: issue.id, assigneeName: text(form, "assigneeName"), operatorName: text(form, "operatorName") }) } catch (cause) { setError(cause instanceof Error ? cause.message : "Assignment could not be saved.") } finally { setSaving(false) } }
  return <form onSubmit={submit}><FieldGroup><Field><FieldLabel htmlFor={`${prefix}-assignee`}>Assigned to</FieldLabel><Input id={`${prefix}-assignee`} name="assigneeName" defaultValue={issue.assigneeName ?? ""} placeholder="Enter a name or leave blank to unassign" /></Field><Field><FieldLabel htmlFor={`${prefix}-operator`}>Acting operator</FieldLabel><Input id={`${prefix}-operator`} name="operatorName" required autoComplete="name" /></Field>{error ? <FieldError>{error}</FieldError> : null}<Button type="submit" size="lg" disabled={saving}><UserRound aria-hidden="true" data-icon="inline-start" />{saving ? "Saving…" : "Save assignment"}</Button></FieldGroup></form>
}

function CommentForm({ issue }: { issue: Issue }) {
  const { addIssueComment } = useInventory()
  const prefix = useId()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const formElement = event.currentTarget; const form = new FormData(formElement); try { await addIssueComment({ issueId: issue.id, body: text(form, "body"), operatorName: text(form, "operatorName"), file: photo(form), photoType: "Condition", caption: text(form, "body") }); formElement.reset() } catch (cause) { setError(cause instanceof Error ? cause.message : "Follow-up could not be saved.") } finally { setSaving(false) } }
  return <form onSubmit={submit}><FieldGroup><Field><FieldLabel htmlFor={`${prefix}-body`}>Follow-up comment</FieldLabel><Textarea id={`${prefix}-body`} name="body" placeholder="Return preparation, supplier follow-up, field findings, or next action" /></Field><Field><FieldLabel htmlFor={`${prefix}-photo`}><Camera aria-hidden="true" data-icon="inline-start" />Additional photo</FieldLabel><Input id={`${prefix}-photo`} name="photo" type="file" accept="image/*" capture="environment" /><FieldDescription>Optional for follow-up. A Damaged Issue must have at least one photo before it can be completed.</FieldDescription></Field><Field><FieldLabel htmlFor={`${prefix}-operator`}>Operator name</FieldLabel><Input id={`${prefix}-operator`} name="operatorName" required autoComplete="name" /></Field>{error ? <FieldError>{error}</FieldError> : null}<Button type="submit" size="lg" disabled={saving}><MessageSquare aria-hidden="true" data-icon="inline-start" />{saving ? "Adding…" : "Add follow-up"}</Button></FieldGroup></form>
}

function TransitionForm({ issue }: { issue: Issue }) {
  const { snapshot, transitionIssue } = useInventory()
  const prefix = useId()
  const options: IssueStatus[] = issue.status === "Open" ? ["In Progress", "Resolved", "Dismissed"] : issue.status === "In Progress" ? ["Open", "Resolved", "Dismissed"] : ["Open"]
  const [toStatus, setToStatus] = useState<IssueStatus>(options[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); try { await transitionIssue({ issueId: issue.id, toStatus, note: text(form, "note"), operatorName: text(form, "operatorName"), resolvedProjectId: text(form, "resolvedProjectId") || null }) } catch (cause) { setError(cause instanceof Error ? cause.message : "Issue status could not be changed.") } finally { setSaving(false) } }
  return <form onSubmit={submit}><FieldGroup><Field><FieldLabel htmlFor={`${prefix}-status`}>Change status</FieldLabel><NativeSelect className="w-full" id={`${prefix}-status`} value={toStatus} onChange={(event) => setToStatus(event.target.value as IssueStatus)}>{options.map((status) => <NativeSelectOption key={status}>{status}</NativeSelectOption>)}</NativeSelect></Field>{issue.type === "Unknown shipment" && toStatus === "Resolved" ? <Field><FieldLabel htmlFor={`${prefix}-project`}>Confirmed project</FieldLabel><NativeSelect className="w-full" id={`${prefix}-project`} name="resolvedProjectId" required defaultValue=""><NativeSelectOption value="">Select project</NativeSelectOption>{snapshot.projects.filter((project) => project.siteId === issue.siteId).map((project) => <NativeSelectOption key={project.id} value={project.id}>{project.name}</NativeSelectOption>)}</NativeSelect><FieldDescription>The original handwritten label and Receiving evidence remain unchanged.</FieldDescription></Field> : null}<Field><FieldLabel htmlFor={`${prefix}-note`}>{toStatus === "Resolved" ? "Resolution note" : toStatus === "Dismissed" ? "Dismissal reason" : toStatus === "Open" ? "Reopen note" : "Progress note"}</FieldLabel><Textarea id={`${prefix}-note`} name="note" required /></Field><Field><FieldLabel htmlFor={`${prefix}-operator`}>Operator name</FieldLabel><Input id={`${prefix}-operator`} name="operatorName" required autoComplete="name" /></Field>{error ? <FieldError>{error}</FieldError> : null}<Button type="submit" size="lg" disabled={saving}><CheckCircle2 aria-hidden="true" data-icon="inline-start" />{saving ? "Updating…" : `Mark ${toStatus.toLowerCase()}`}</Button></FieldGroup></form>
}

export function IssueWorkspace({ issueId }: { issueId: string }) {
  const { snapshot, isHydrating } = useInventory()
  const issue = snapshot.issues.find((item) => item.id === issueId)
  if (!issue && isHydrating) return <div className="flex flex-1 items-center justify-center" role="status" aria-live="polite"><p className="text-sm text-muted-foreground">Loading saved Issue…</p></div>
  if (!issue) return <div className="flex flex-1 flex-col gap-4"><PageHeader title="Issue not available" description="This Issue is not present in the local Inventory records." /><Button nativeButton={false} render={<Link href="/inventory/issues" />} variant="outline" className="w-fit"><ArrowLeft aria-hidden="true" data-icon="inline-start" />Back to Issues</Button><Empty className="border"><EmptyHeader><EmptyMedia variant="icon"><AlertCircle /></EmptyMedia><EmptyTitle>Issue not available</EmptyTitle><EmptyDescription>This record may belong to another device backup or no longer exists in the current local dataset.</EmptyDescription></EmptyHeader></Empty></div>

  const project = issue.projectId ? snapshot.projects.find((item) => item.id === issue.projectId) : null
  const lot = issue.lotId ? snapshot.lots.find((item) => item.id === issue.lotId) : null
  const group = lot ? snapshot.groups.find((item) => item.id === lot.groupId) : null
  const receipt = issue.receiptId ? snapshot.receipts.find((item) => item.id === issue.receiptId) : null
  const location = issue.locationId ? snapshot.locations.find((item) => item.id === issue.locationId) : lot?.locationId ? snapshot.locations.find((item) => item.id === lot.locationId) : null
  const movement = issue.movementId ? snapshot.movements.find((item) => item.id === issue.movementId) : null
  const outbound = issue.outboundBatchId ? snapshot.outboundBatches.find((item) => item.id === issue.outboundBatchId) : null
  const photos = issue.photoIds.flatMap((id) => snapshot.photos.filter((photo) => photo.id === id))
  const comments = snapshot.issueComments.filter((comment) => comment.issueId === issue.id)
  const transitions = snapshot.issueTransitions.filter((transition) => transition.issueId === issue.id)
  const history = [...comments.map((comment) => ({ id: comment.id, at: comment.createdAt, label: "Comment", text: comment.body || "Photo evidence added.", operatorName: comment.operatorName })), ...transitions.map((transition) => ({ id: transition.id, at: transition.occurredAt, label: transition.kind, text: transition.note || `${transition.fromStatus ?? "New"} to ${transition.toStatus}`, operatorName: transition.operatorName }))].toSorted((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const evidenceState = issueEvidenceState(snapshot, issue)

  const links = [
    project ? { label: "Project", value: project.name, href: `/inventory/projects/${project.slug}` } : null,
    group && project ? { label: "Material", value: group.name, href: `/inventory/projects/${project.slug}` } : null,
    receipt ? { label: "Receipt", value: receipt.receiptNumber || "No receipt number", href: "/inventory/receiving" } : null,
    location ? { label: "Location", value: location.name, href: `/inventory/storage/${location.slug}` } : null,
    movement ? { label: "Movement", value: movement.reason, href: "/inventory/movements" } : null,
    outbound ? { label: "Outbound", value: outbound.state, href: "/inventory/outbound" } : null,
  ].filter((link): link is NonNullable<typeof link> => Boolean(link))

  return <div className="flex flex-1 flex-col gap-6">
    <PageHeader title={issue.title} description={`${issue.type} Issue · ${issue.status}`} />
    <Button nativeButton={false} render={<Link href="/inventory/issues" />} variant="ghost" className="w-fit"><ArrowLeft aria-hidden="true" data-icon="inline-start" />Back to Issues</Button>
    <Card>
      <CardHeader className="relative border-b"><span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" /><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-xl">{issue.title}</CardTitle><Badge variant={statusVariant(issue.status)}>{issue.status}</Badge></div><CardDescription className="mt-1">{issue.type} · {issue.priority} priority · recorded by {issue.operatorName}</CardDescription></div>{issue.blocking ? <Badge variant="destructive">Blocks readiness</Badge> : null}</div></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs text-muted-foreground">Assigned to</p><p className="mt-1 font-medium">{issue.assigneeName ?? "Unassigned"}</p></div><div><p className="text-xs text-muted-foreground">Evidence</p><p className="mt-1 font-medium">{evidenceState}</p></div><div><p className="text-xs text-muted-foreground">Created</p><time className="mt-1 block font-medium" dateTime={issue.createdAt}>{formatter.format(new Date(issue.createdAt))}</time></div><div><p className="text-xs text-muted-foreground">Current state</p><p className="mt-1 font-medium">{isIssueActive(issue) ? "Active follow-up" : "Closed"}</p></div></CardContent>
    </Card>

    {evidenceState === "Needs evidence" ? <Alert variant="destructive"><Camera aria-hidden="true" /><AlertTitle>Damage photo required</AlertTitle><AlertDescription>Add a clear photo in Follow-up before this legacy Damaged Issue can be resolved or dismissed.</AlertDescription></Alert> : null}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
      <div className="flex flex-col gap-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Camera aria-hidden="true" />Evidence</CardTitle><CardDescription>{issue.type === "Damaged" ? "Damage evidence remains attached through assignment, return follow-up, resolution, and reopening." : "Optional photos attached to this Issue and its follow-up."}</CardDescription></CardHeader><CardContent>{photos.length ? <div className="grid gap-3 sm:grid-cols-2">{photos.map((record) => <EvidenceImage key={record.id} record={record} />)}</div> : <Empty className="border"><EmptyHeader><EmptyMedia variant="icon"><Camera /></EmptyMedia><EmptyTitle>No photo evidence</EmptyTitle><EmptyDescription>{issue.type === "Damaged" ? "Add a damage photo before completing this Issue." : "Photos are optional for this Issue type."}</EmptyDescription></EmptyHeader></Empty>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList aria-hidden="true" />Issue history</CardTitle><CardDescription>Comments and lifecycle transitions are append-only.</CardDescription></CardHeader><CardContent><ol className="flex flex-col gap-3">{history.map((item) => <li key={`${item.label}-${item.id}`} className="border-l-2 border-l-brand-orange pl-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{item.label}</Badge><time className="text-xs text-muted-foreground" dateTime={item.at}>{formatter.format(new Date(item.at))}</time></div><p className="mt-1 text-sm font-medium">{item.text}</p><p className="mt-0.5 text-xs text-muted-foreground">{item.operatorName}</p></li>)}</ol></CardContent></Card>
        <Card><CardHeader><CardTitle>Follow-up</CardTitle><CardDescription>Add operational notes or evidence. Supplier-return preparation belongs here; vendor claims and shipping do not.</CardDescription></CardHeader><CardContent><CommentForm issue={issue} /></CardContent></Card>
      </div>
      <aside className="flex flex-col gap-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Link2 aria-hidden="true" />Linked records</CardTitle></CardHeader><CardContent>{links.length ? <div className="flex flex-col gap-2">{links.map((link) => <Link key={`${link.label}-${link.href}`} href={link.href} className="flex min-h-11 items-center justify-between rounded-lg border px-3 hover:bg-muted"><span><span className="block text-xs text-muted-foreground">{link.label}</span><span className="font-medium">{link.value}</span></span><Link2 aria-hidden="true" /></Link>)}</div> : <p className="text-sm text-muted-foreground">No operational record is linked.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Assignment</CardTitle><CardDescription>Names remain historical even after authentication is added.</CardDescription></CardHeader><CardContent><AssignmentForm key={issue.assigneeName ?? "unassigned"} issue={issue} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Lifecycle action</CardTitle><CardDescription>Every status change requires a note and remains in history.</CardDescription></CardHeader><CardContent><TransitionForm key={issue.status} issue={issue} /></CardContent></Card>
      </aside>
    </div>
  </div>
}
