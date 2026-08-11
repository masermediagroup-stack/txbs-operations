"use client"

import Link from "next/link"
import { AlertTriangle, MapPin, MoveRight } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { describePosition, lotVerificationState } from "@/features/inventory/domain/selectors"
import type { InventorySnapshot, MaterialLot } from "@/features/inventory/domain/inventory"
import { RecordIssueSheet } from "@/features/inventory/components/issue-actions"
import { VerifyLotSheet } from "@/features/inventory/components/lot-actions"

function LotFacts({ lot, snapshot }: { lot: MaterialLot; snapshot: InventorySnapshot }) {
  const location = snapshot.locations.find((item) => item.id === lot.locationId)
  const verification = lotVerificationState(snapshot, lot)
  return <>
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={verification.label === "Verified" ? "secondary" : "outline"}>{verification.label}</Badge>
      <Badge variant="outline">{lot.condition}</Badge>
      <Badge variant="outline">{lot.protection}</Badge>
      <Badge variant="outline">{lot.accessibility}</Badge>
    </div>
    <div className="flex flex-col gap-1 text-sm">
      {location ? <Link href={`/inventory/storage/${location.slug}`} className="inline-flex w-fit items-center gap-1.5 font-medium text-primary hover:underline"><MapPin aria-hidden="true" />{location.name}</Link> : <span className="text-muted-foreground">Location unknown</span>}
      <span className="text-xs text-muted-foreground">{describePosition(lot.position)}</span>
    </div>
  </>
}

export function LotLedger({ lots, snapshot }: { lots: MaterialLot[]; snapshot: InventorySnapshot }) {
  return <div className="flex flex-col gap-3">
    {lots.map((lot) => {
      const group = snapshot.groups.find((item) => item.id === lot.groupId)
      return <article key={lot.id} className="overflow-hidden rounded-xl border bg-card">
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(12rem,1.2fr)_minmax(14rem,1fr)_minmax(12rem,1fr)_auto] lg:items-center">
          <div><h3 className="font-semibold">{group?.name ?? "Material lot"}</h3><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{group?.description}</p></div>
          <div><p className="font-mono text-lg font-semibold tabular-nums">{lot.quantity ?? "Unknown"}</p><p className="text-xs text-muted-foreground">{lot.packageType}{lot.quantity === 1 ? "" : " packages"}</p></div>
          <div className="flex flex-col gap-2"><LotFacts lot={lot} snapshot={snapshot} /></div>
          <div className="flex flex-col gap-2"><VerifyLotSheet lot={lot} /><Button render={<Link href={`/inventory/movements?lot=${lot.id}`} />} variant="outline"><MoveRight aria-hidden="true" data-icon="inline-start" />Move material</Button><RecordIssueSheet projectId={lot.projectId} lotId={lot.id} /></div>
        </div>
        {lot.handlingRequirements.length ? <Alert className="rounded-none border-x-0 border-b-0"><AlertTriangle aria-hidden="true" /><AlertTitle>Handling requirements</AlertTitle><AlertDescription>{lot.handlingRequirements.join(" · ")}</AlertDescription></Alert> : null}
        {lot.migrationNote ? <p className="border-t bg-muted/35 px-4 py-2 text-xs text-muted-foreground">{lot.migrationNote}</p> : null}
      </article>
    })}
  </div>
}
