"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Activity, AlertTriangle, ArrowRightLeft, Boxes, CheckCircle2, ClipboardCheck, HardHat, MapPin, PackageCheck, Search, ShieldAlert } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useInventory } from "@/features/inventory/components/inventory-provider"
import { buildOverviewMetrics } from "@/features/overview/domain/overview-metrics"

const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

function MetricCard({ label, value, detail, href, icon: Icon }: { label: string; value: number; detail: string; href: string; icon: typeof Boxes }) {
  return <Link href={href} className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="h-full transition group-hover:border-primary/30 group-hover:shadow-sm"><CardContent className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p><p className="mt-2 font-mono text-3xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-lg bg-primary/8 p-2 text-primary"><Icon aria-hidden="true" className="size-5" /></span></CardContent></Card></Link>
}

function VerificationBar({ current, overdue, never }: { current: number; overdue: number; never: number }) {
  const total = Math.max(1, current + overdue + never)
  const values = [
    { label: "Current", value: current, className: "bg-primary" },
    { label: "Needs verification", value: overdue, className: "bg-brand-orange" },
    { label: "Never verified", value: never, className: "bg-muted-foreground/45" },
  ]
  return <div className="space-y-4"><div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${current} current, ${overdue} overdue, ${never} never verified`}>{values.map((item) => item.value ? <span key={item.label} className={item.className} style={{ width: `${item.value / total * 100}%` }} /> : null)}</div><dl className="grid gap-2 sm:grid-cols-3">{values.map((item) => <div key={item.label} className="rounded-lg border px-3 py-2"><dt className="flex items-center gap-2 text-xs text-muted-foreground"><span aria-hidden="true" className={`size-2 rounded-full ${item.className}`} />{item.label}</dt><dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{item.value}</dd></div>)}</dl></div>
}

function TechOverview() {
  return <div className="flex flex-1 flex-col gap-6"><PageHeader eyebrow="Field workspace" title="Your TBS field work" description="Review assigned installation work, outbound handoffs, and read-only Inventory context from one focused workspace." action={<Badge variant="outline" className="bg-card"><HardHat aria-hidden="true" data-icon="inline-start" />Tech account</Badge>} /><Link href="/my-work" className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"><Card className="transition group-hover:border-primary/30 group-hover:shadow-sm"><CardHeader className="relative border-b"><span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" /><CardTitle>Open My Work</CardTitle><CardDescription>Assigned field work, inventory search, outbound context, and installation confirmation.</CardDescription></CardHeader><CardContent className="flex items-center justify-between gap-4"><p className="text-sm text-muted-foreground">Start with the work assigned to your account.</p><HardHat aria-hidden="true" className="text-primary" /></CardContent></Card></Link></div>
}

export function OverviewPage({ role = "Operator" }: { role?: "Operator" | "Tech" }) {
  const { snapshot, isHydrating } = useInventory()
  const [siteId, setSiteId] = useState("all")
  const metrics = useMemo(() => buildOverviewMetrics(snapshot, siteId), [siteId, snapshot])
  if (role === "Tech") return <TechOverview />
  const verificationTotal = metrics.verification.current + metrics.verification.overdue + metrics.verification.never
  return <div className="flex flex-1 flex-col gap-6">
    <PageHeader eyebrow="Operations overview" title="What needs attention today" description="A live operational summary across TBS inventory sites, with every count linked back to its working records." action={<Badge variant="outline" className="bg-card"><CheckCircle2 aria-hidden="true" data-icon="inline-start" />Demo workspace</Badge>} />

    <Card><CardHeader><CardTitle>Quick actions</CardTitle><CardDescription>Start the workflows used most often during material operations.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Button nativeButton={false} render={<Link href="/inventory/receiving" />} variant="secondary" className="h-auto min-h-11 justify-start px-4"><ClipboardCheck aria-hidden="true" data-icon="inline-start" />Receive material</Button><Button nativeButton={false} render={<Link href="/inventory/movements" />} variant="secondary" className="h-auto min-h-11 justify-start px-4"><ArrowRightLeft aria-hidden="true" data-icon="inline-start" />Move material</Button><Button nativeButton={false} render={<Link href="/reports#material-verification-worklist" />} variant="secondary" className="h-auto min-h-11 justify-start px-4"><Search aria-hidden="true" data-icon="inline-start" />Verify material</Button><Button nativeButton={false} render={<Link href="/inventory/outbound" />} variant="secondary" className="h-auto min-h-11 justify-start px-4"><PackageCheck aria-hidden="true" data-icon="inline-start" />Prepare outbound</Button></CardContent></Card>

    <Card size="sm"><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Demo environment</p><p className="text-sm text-muted-foreground">Records and private photos may contain sample or test data and sync securely across signed-in devices.</p></div><label className="grid gap-1.5 text-sm font-medium sm:min-w-56">Site<NativeSelect value={siteId} onChange={(event) => setSiteId(event.target.value)} aria-label="Filter Overview by site"><NativeSelectOption value="all">All sites</NativeSelectOption>{snapshot.sites.filter((site) => site.active).map((site) => <NativeSelectOption key={site.id} value={site.id}>{site.name}</NativeSelectOption>)}</NativeSelect></label></CardContent></Card>

    <section aria-labelledby="overview-kpis"><h2 id="overview-kpis" className="sr-only">Current inventory indicators</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Projects present" value={metrics.projects} detail="Projects with material on site" href="/inventory/projects" icon={Boxes} /><MetricCard label="Present lots" value={metrics.presentLots} detail="Physical material records" href="/inventory/materials" icon={PackageCheck} /><MetricCard label="Materials to verify" value={metrics.verificationDue} detail="Overdue or never verified" href="/reports#material-verification-worklist" icon={ClipboardCheck} /><MetricCard label="Blocking issues" value={metrics.blockingIssues} detail="Active readiness blockers" href="/inventory/issues" icon={ShieldAlert} /></div></section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,.65fr)]">
      <Card><CardHeader className="relative border-b"><span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-1 bg-brand-orange" /><CardTitle>Verification health</CardTitle><CardDescription>{verificationTotal} present lot{verificationTotal === 1 ? "" : "s"} in the current Site view.</CardDescription></CardHeader><CardContent><VerificationBar current={metrics.verification.current} overdue={metrics.verification.overdue} never={metrics.verification.never} /></CardContent></Card>
      <Card><CardHeader><CardTitle>Current workflow</CardTitle><CardDescription>Recorded since Monday, plus the active outbound queue.</CardDescription></CardHeader><CardContent><dl className="grid grid-cols-2 gap-3">{[["Receipts", metrics.workflow.receiptsThisWeek], ["Movements", metrics.workflow.movementsThisWeek], ["Active outbound", metrics.workflow.activeOutbound], ["Departed", metrics.workflow.departedThisWeek]].map(([label, value]) => <div key={label} className="rounded-lg border bg-muted/20 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</dd></div>)}</dl></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Site snapshot</CardTitle><CardDescription>Physical Inventory remains grouped by its current TBS storage Site.</CardDescription></CardHeader><CardContent className="grid gap-3 lg:grid-cols-2">{metrics.siteSnapshots.map((site) => <Link key={site.id} href={`/inventory/storage#site-${site.id}`} className="group rounded-xl border p-4 outline-none transition hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{site.name}</p><p className="mt-1 text-xs text-muted-foreground">{site.projects} projects · {site.lots} lots · {site.knownPackages} known packages{site.unknownLots ? ` + ${site.unknownLots} unknown` : ""}</p></div><MapPin aria-hidden="true" className="text-primary" /></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><span className="rounded-md bg-muted/60 px-2 py-1">{site.verificationDue} need verification</span><span className="rounded-md bg-muted/60 px-2 py-1">{site.activeIssues} active issues</span></div></Link>)}</CardContent></Card>

    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Attention</CardTitle><CardDescription>Open work that can affect material readiness.</CardDescription></CardHeader><CardContent className="grid gap-2">{[
        { label: "Materials to verify", value: metrics.attention.verificationDue, href: "/reports#material-verification-worklist", icon: ClipboardCheck },
        { label: "Blocking Issues", value: metrics.attention.blockingIssues, href: "/inventory/issues", icon: AlertTriangle },
        { label: "Damaged material", value: metrics.attention.damagedMaterial, href: "/inventory/issues", icon: ShieldAlert },
        { label: "Ready outbound", value: metrics.attention.readyOutbound, href: "/inventory/outbound", icon: PackageCheck },
      ].map((item) => <Link key={item.label} href={item.href} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><item.icon aria-hidden="true" className="size-4 text-muted-foreground" /><span className="flex-1 text-sm font-medium">{item.label}</span><span className="font-mono font-semibold tabular-nums">{item.value}</span></Link>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Recent activity</CardTitle><CardDescription>The latest recorded actions in this Site view.</CardDescription></CardHeader><CardContent>{metrics.recentActivity.length ? <ol className="space-y-2">{metrics.recentActivity.map((event) => { const project = snapshot.projects.find((item) => item.id === event.projectId); return <li key={event.id}><Link href={project ? `/inventory/projects/${project.slug}` : "/inventory/activity"} className="block rounded-lg border px-3 py-2 outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><span className="flex items-center gap-2 text-sm font-medium"><Activity aria-hidden="true" className="size-4 text-muted-foreground" />{event.type}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{project?.name ?? event.entityType} · {event.operatorName} · {formatter.format(new Date(event.occurredAt))}</span></Link></li>})}</ol> : <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Workflow activity will appear here as the demo records are created.</p>}</CardContent></Card>
    </div>

    {isHydrating ? <p role="status" className="sr-only">Refreshing shared Overview data.</p> : null}
  </div>
}
