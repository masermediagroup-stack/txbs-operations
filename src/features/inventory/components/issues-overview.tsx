"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useDeferredValue, useRef, useState } from "react"
import { ArrowUpRight, Camera, CheckCircle2, Filter } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { RecordIssueSheet } from "@/features/inventory/components/issue-actions"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { issueEvidenceState, isIssueActive } from "@/features/inventory/domain/selectors"
import { issuePriorities, issueStatuses, issueTypes, type IssueStatus } from "@/features/inventory/domain/inventory"

const day = 86_400_000

function ageInDays(createdAt: string) { return Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / day)) }
function statusVariant(status: IssueStatus) { return status === "Resolved" ? "secondary" as const : status === "Dismissed" ? "outline" as const : status === "In Progress" ? "default" as const : "destructive" as const }

export function IssuesOverview() {
  const { snapshot } = useInventory()
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramsRef = useRef(searchParams.toString())
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "")
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "Active")
  const [type, setType] = useState(() => searchParams.get("type") ?? "All types")
  const [priority, setPriority] = useState(() => searchParams.get("priority") ?? "All priorities")
  const [projectId, setProjectId] = useState(() => searchParams.get("project") ?? "All projects")
  const [assignee, setAssignee] = useState(() => searchParams.get("assignee") ?? "All assignees")
  const [age, setAge] = useState(() => searchParams.get("age") ?? "Any age")
  function updateFilter(key: string, value: string, defaultValue: string, update: (next: string) => void) {
    update(value)
    const next = new URLSearchParams(paramsRef.current)
    if (value === defaultValue) next.delete(key); else next.set(key, value)
    paramsRef.current = next.toString()
    router.replace(`/inventory/issues${next.size ? `?${next}` : ""}`, { scroll: false })
  }
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const assignees = [...new Set(snapshot.issues.map((issue) => issue.assigneeName).filter((name): name is string => Boolean(name)))].toSorted()
  const filtered = snapshot.issues.filter((issue) => {
    const project = snapshot.projects.find((item) => item.id === issue.projectId)
    const matchesQuery = !deferredQuery || [issue.title, issue.description, issue.type, project?.name ?? "", issue.assigneeName ?? ""].some((value) => value.toLowerCase().includes(deferredQuery))
    const matchesStatus = status === "All statuses" ? true : status === "Active" ? isIssueActive(issue) : issue.status === status
    const matchesType = type === "All types" || issue.type === type
    const matchesPriority = priority === "All priorities" || issue.priority === priority
    const matchesProject = projectId === "All projects" || issue.projectId === projectId
    const matchesAssignee = assignee === "All assignees" ? true : assignee === "Unassigned" ? !issue.assigneeName : issue.assigneeName === assignee
    const minimumAge = age === "7+ days" ? 7 : age === "14+ days" ? 14 : age === "30+ days" ? 30 : 0
    return matchesQuery && matchesStatus && matchesType && matchesPriority && matchesProject && matchesAssignee && ageInDays(issue.createdAt) >= minimumAge
  }).toSorted((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  const activeCount = snapshot.issues.filter(isIssueActive).length
  const evidenceDue = snapshot.issues.filter((issue) => issueEvidenceState(snapshot, issue) === "Needs evidence").length

  return <div className="flex flex-1 flex-col gap-6">
    <PageHeader eyebrow="Inventory" title="Issues" description="Trace material exceptions from field evidence through assignment, follow-up, and resolution." />
    <Card>
      <CardHeader className="relative border-b"><span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" /><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle className="text-xl">Inventory Issues</CardTitle><CardDescription>Durable exceptions linked to the material, receipt, movement, location, or outbound work they affect.</CardDescription></div><RecordIssueSheet size="lg" /></div></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Active Issues</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{activeCount}</p></div><div><p className="text-xs text-muted-foreground">Need damage evidence</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{evidenceDue}</p></div><div><p className="text-xs text-muted-foreground">All history</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{snapshot.issues.length}</p></div></CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Filter aria-hidden="true" />Issue worklist</CardTitle><CardDescription>Filter by operational state, affected work, ownership, and age.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-5">
        <FieldGroup className="gap-3">
          <Field><FieldLabel htmlFor="issue-search">Search Issues</FieldLabel><Input id="issue-search" name="q" type="search" value={query} onChange={(event) => updateFilter("q", event.target.value, "", setQuery)} placeholder="Title, project, type, or assignee" autoComplete="off" /></Field>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Field><FieldLabel htmlFor="issue-status">Status</FieldLabel><NativeSelect className="w-full" id="issue-status" name="status" value={status} onChange={(event) => updateFilter("status", event.target.value, "Active", setStatus)}><NativeSelectOption>Active</NativeSelectOption><NativeSelectOption>All statuses</NativeSelectOption>{issueStatuses.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
            <Field><FieldLabel htmlFor="issue-type">Type</FieldLabel><NativeSelect className="w-full" id="issue-type" name="type" value={type} onChange={(event) => updateFilter("type", event.target.value, "All types", setType)}><NativeSelectOption>All types</NativeSelectOption>{issueTypes.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
            <Field><FieldLabel htmlFor="issue-priority">Priority</FieldLabel><NativeSelect className="w-full" id="issue-priority" name="priority" value={priority} onChange={(event) => updateFilter("priority", event.target.value, "All priorities", setPriority)}><NativeSelectOption>All priorities</NativeSelectOption>{issuePriorities.map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
            <Field><FieldLabel htmlFor="issue-project">Project</FieldLabel><NativeSelect className="w-full" id="issue-project" name="project" value={projectId} onChange={(event) => updateFilter("project", event.target.value, "All projects", setProjectId)}><NativeSelectOption>All projects</NativeSelectOption>{snapshot.projects.map((project) => <NativeSelectOption key={project.id} value={project.id}>{project.name}</NativeSelectOption>)}</NativeSelect></Field>
            <Field><FieldLabel htmlFor="issue-assignee">Assignee</FieldLabel><NativeSelect className="w-full" id="issue-assignee" name="assignee" value={assignee} onChange={(event) => updateFilter("assignee", event.target.value, "All assignees", setAssignee)}><NativeSelectOption>All assignees</NativeSelectOption><NativeSelectOption>Unassigned</NativeSelectOption>{assignees.map((name) => <NativeSelectOption key={name}>{name}</NativeSelectOption>)}</NativeSelect></Field>
            <Field><FieldLabel htmlFor="issue-age">Age</FieldLabel><NativeSelect className="w-full" id="issue-age" name="age" value={age} onChange={(event) => updateFilter("age", event.target.value, "Any age", setAge)}>{["Any age", "7+ days", "14+ days", "30+ days"].map((item) => <NativeSelectOption key={item}>{item}</NativeSelectOption>)}</NativeSelect></Field>
          </div>
        </FieldGroup>

        {filtered.length ? <>
          <div className="hidden overflow-x-auto rounded-xl border lg:block"><table className="w-full min-w-[62rem] text-left text-sm"><thead className="bg-muted/55 text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">State</th><th className="px-3 py-2 font-medium">Issue</th><th className="px-3 py-2 font-medium">Project / location</th><th className="px-3 py-2 font-medium">Assignee</th><th className="px-3 py-2 font-medium">Age</th><th className="px-3 py-2 font-medium"><span className="sr-only">Open</span></th></tr></thead><tbody>{filtered.map((issue) => { const project = snapshot.projects.find((item) => item.id === issue.projectId); const lot = snapshot.lots.find((item) => item.id === issue.lotId); const location = snapshot.locations.find((item) => item.id === issue.locationId || item.id === lot?.locationId); const evidence = issueEvidenceState(snapshot, issue); return <tr key={issue.id} className="border-t align-middle"><td className="px-3 py-3"><div className="flex flex-wrap gap-1.5"><Badge variant={statusVariant(issue.status)}>{issue.status}</Badge>{issue.blocking ? <Badge variant="destructive">Blocking</Badge> : null}</div></td><td className="px-3 py-3"><Link href={`/inventory/issues/${issue.id}`} className="font-medium text-primary hover:underline">{issue.title}</Link><p className="mt-0.5 text-xs text-muted-foreground">{issue.type} · {issue.priority}{evidence === "Needs evidence" ? " · Damage photo needed" : ""}</p></td><td className="px-3 py-3"><p>{project?.name ?? "No project assigned"}</p><p className="text-xs text-muted-foreground">{location?.name ?? "Location not linked"}</p></td><td className="px-3 py-3">{issue.assigneeName ?? "Unassigned"}</td><td className="px-3 py-3 font-mono tabular-nums">{ageInDays(issue.createdAt)}d</td><td className="px-3 py-3"><Link href={`/inventory/issues/${issue.id}`} aria-label={`Open ${issue.title}`} className="inline-flex size-9 items-center justify-center rounded-lg border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowUpRight aria-hidden="true" /></Link></td></tr> })}</tbody></table></div>
          <div className="flex flex-col gap-3 lg:hidden">{filtered.map((issue) => { const project = snapshot.projects.find((item) => item.id === issue.projectId); const evidence = issueEvidenceState(snapshot, issue); return <Link key={issue.id} href={`/inventory/issues/${issue.id}`} className="rounded-xl border p-4 outline-none hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{issue.title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{project?.name ?? "No project assigned"} · {ageInDays(issue.createdAt)}d</p></div><ArrowUpRight aria-hidden="true" /></div><div className="mt-3 flex flex-wrap gap-1.5"><Badge variant={statusVariant(issue.status)}>{issue.status}</Badge><Badge variant="outline">{issue.type}</Badge><Badge variant={issue.priority === "High" || issue.priority === "Urgent" ? "destructive" : "outline"}>{issue.priority}</Badge>{evidence === "Needs evidence" ? <Badge variant="destructive"><Camera aria-hidden="true" />Photo needed</Badge> : null}</div><p className="mt-3 text-sm text-muted-foreground">{issue.assigneeName ? `Assigned to ${issue.assigneeName}` : "Unassigned"}</p></Link> })}</div>
        </> : <Empty className="border"><EmptyHeader><EmptyMedia variant="icon">{snapshot.issues.length ? <Filter /> : <CheckCircle2 />}</EmptyMedia><EmptyTitle>{snapshot.issues.length ? "No Issues match these filters" : "No Issues recorded"}</EmptyTitle><EmptyDescription>{snapshot.issues.length ? "Adjust the filters or search text to return to the worklist." : "Use Record Issue when material, receiving, storage, movement, or outbound work needs follow-up."}</EmptyDescription></EmptyHeader></Empty>}
      </CardContent>
    </Card>
  </div>
}
