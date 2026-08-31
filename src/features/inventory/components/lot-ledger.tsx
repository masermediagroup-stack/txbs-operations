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

function LotFacts({ lot, snapshot, verificationLabel }: { lot: MaterialLot; snapshot: InventorySnapshot; verificationLabel: string }) {
  const location = snapshot.locations.find((item) => item.id === lot.locationId)
  return <>
    <div className="flex flex-wrap items-center gap-1.5">
      {verificationLabel !== "Verified" ? <Badge variant="outline">{verificationLabel}</Badge> : null}
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
      const verification = lotVerificationState(snapshot, lot)
      return <article id={`material-lot-${lot.id}`} key={lot.id} className="scroll-mt-24 overflow-hidden rounded-xl border bg-card target:ring-2 target:ring-primary/45 target:ring-offset-2">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><h3 className="font-semibold">{group?.name ?? "Material lot"}</h3><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{group?.description}</p></div>
            <div className="shrink-0">
              {verification.label === "Verified"
                ? <Badge className="bg-brand-orange text-white">Verified</Badge>
                : <VerifyLotSheet lot={lot} />}
            </div>
          </div>
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-[minmax(8rem,.55fr)_minmax(13rem,1.45fr)] sm:items-start">
            <div><p className="font-mono text-lg font-semibold tabular-nums">{lot.quantity ?? "Unknown"}</p><p className="text-xs text-muted-foreground">{lot.packageType}{lot.quantity === 1 ? "" : " packages"}</p></div>
            <div className="flex flex-col gap-2"><LotFacts lot={lot} snapshot={snapshot} verificationLabel={verification.label} /></div>
          </div>
          <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:justify-end"><Button nativeButton={false} render={<Link href={`/inventory/movements?lot=${lot.id}`} />} variant="outline"><MoveRight aria-hidden="true" data-icon="inline-start" />Move material</Button><RecordIssueSheet projectId={lot.projectId} lotId={lot.id} /></div>
        </div>
        {lot.handlingRequirements.length ? <Alert className="rounded-none border-x-0 border-b-0"><AlertTriangle aria-hidden="true" /><AlertTitle>Handling requirements</AlertTitle><AlertDescription>{lot.handlingRequirements.join(" · ")}</AlertDescription></Alert> : null}
        {lot.migrationNote ? <p className="border-t bg-muted/35 px-4 py-2 text-xs text-muted-foreground">{lot.migrationNote}</p> : null}
      </article>
    })}
  </div>
}
