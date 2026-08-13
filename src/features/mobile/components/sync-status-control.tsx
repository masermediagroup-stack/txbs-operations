"use client"

import { AlertTriangle, CheckCircle2, Cloud, CloudOff, Download, HardDrive, RefreshCw, Trash2, UploadCloud } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { commandLabel, useMobileSync } from "@/features/mobile/components/mobile-sync-provider"
import { formatBytes } from "@/features/mobile/services/mobile-sync-journal"
import { cn } from "@/lib/utils"

function relativeTime(value: string | null) {
  if (!value) return "Not yet"
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function SyncStatusControl() {
  const sync = useMobileSync()
  const pendingCount = sync.mutations.length
  const conflictCount = sync.conflicts.length
  const title = !sync.isOnline
    ? "Offline"
    : conflictCount
      ? `${conflictCount} sync conflict${conflictCount === 1 ? "" : "s"}`
      : pendingCount
        ? `${pendingCount} waiting to sync`
        : sync.updateAvailable
          ? "Update available"
          : "Online"

  const Icon = !sync.isOnline ? CloudOff : conflictCount ? AlertTriangle : pendingCount ? UploadCloud : sync.updateAvailable ? Download : Cloud

  async function downloadJournal() {
    const blob = await sync.exportJournal()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `tbs-mobile-journal-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="relative h-10 gap-2 px-2"
            aria-label={`Open yard sync. ${title}`}
            data-testid="sync-status-trigger"
          />
        }
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "size-5",
            !sync.isOnline && "text-muted-foreground",
            (pendingCount > 0 || sync.updateAvailable) && sync.isOnline && "text-brand-orange",
            conflictCount > 0 && "text-destructive",
          )}
        />
        <span className="hidden text-sm sm:inline">{title}</span>
        {pendingCount + conflictCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-semibold text-white sm:static sm:min-h-5 sm:min-w-5">
            {pendingCount + conflictCount}
          </span>
        ) : null}
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md" aria-describedby="yard-sync-description">
        <SheetHeader className="border-b-2 border-b-brand-orange pr-12">
          <SheetTitle>Yard sync</SheetTitle>
          <SheetDescription id="yard-sync-description">
            Prepare this device for yard work and review anything that exists only on this device.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-2 gap-2" aria-live="polite">
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Connection</p>
              <p className="mt-1 flex items-center gap-2 font-medium">
                {sync.isOnline ? <Cloud aria-hidden="true" className="size-4 text-primary" /> : <CloudOff aria-hidden="true" className="size-4" />}
                {sync.isOnline ? "Online" : "Offline"}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-xs text-muted-foreground">Local-only actions</p>
              <p className="mt-1 font-mono text-lg font-semibold">{pendingCount}</p>
            </div>
          </div>

          {!sync.isOnline ? (
            <Alert>
              <CloudOff aria-hidden="true" />
              <AlertTitle>Working offline</AlertTitle>
              <AlertDescription>Inventory actions still save to this device. Shared updates wait until connectivity and server sync are available.</AlertDescription>
            </Alert>
          ) : null}

          {sync.syncError ? (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Sync needs attention</AlertTitle>
              <AlertDescription>{sync.syncError}</AlertDescription>
            </Alert>
          ) : null}

          {sync.updateAvailable ? (
            <Alert>
              <Download aria-hidden="true" />
              <AlertTitle>Application update ready</AlertTitle>
              <AlertDescription>Apply it when the current yard action is complete. Pending records and photos stay in IndexedDB.</AlertDescription>
            </Alert>
          ) : null}

          <section aria-labelledby="device-preparation-heading" className="space-y-3">
            <div>
              <h3 id="device-preparation-heading" className="font-medium">Device preparation</h3>
              <p className="text-sm text-muted-foreground">{sync.preparedAt ? `Prepared ${relativeTime(sync.preparedAt)}` : "Request persistent storage before field work."}</p>
            </div>
            <Button type="button" size="lg" variant={sync.preparedAt ? "outline" : "default"} className="w-full" onClick={() => void sync.prepareDevice()}>
              <HardDrive aria-hidden="true" data-icon="inline-start" />
              {sync.preparedAt ? "Refresh device preparation" : "Prepare this device"}
            </Button>
            <div className="rounded-lg bg-muted/55 p-3 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Stored</span><span className="font-mono">{formatBytes(sync.storage.usage)}</span></div>
              <div className="mt-1 flex items-center justify-between gap-3"><span className="text-muted-foreground">Available quota</span><span className="font-mono">{formatBytes(sync.storage.quota)}</span></div>
              <p className="mt-2 text-xs text-muted-foreground">{sync.storage.persisted ? "Browser storage is marked persistent." : "The browser may clear local data under storage pressure. Keep a current Inventory backup."}</p>
            </div>
          </section>

          <Separator />

          <section aria-labelledby="pending-work-heading" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="pending-work-heading" className="font-medium">Waiting on this device</h3>
                <p className="text-sm text-muted-foreground">Actions recorded while offline remain visible and exportable.</p>
              </div>
              <Badge variant="outline">{pendingCount}</Badge>
            </div>
            {sync.mutations.length ? (
              <ul className="space-y-2">
                {sync.mutations.map((mutation) => (
                  <li key={mutation.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{commandLabel(mutation.commandType)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{relativeTime(mutation.createdAt)} · {mutation.actor.displayName}</p>
                        {mutation.photoIds.length ? <p className="mt-1 text-xs text-muted-foreground">{mutation.photoIds.length} photo{mutation.photoIds.length === 1 ? "" : "s"} retained</p> : null}
                      </div>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={`Discard ${commandLabel(mutation.commandType)}`} onClick={() => void sync.discardMutation(mutation.id)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-center">
                <CheckCircle2 aria-hidden="true" className="mx-auto size-5 text-primary" />
                <p className="mt-2 text-sm font-medium">No local-only actions</p>
                <p className="mt-1 text-xs text-muted-foreground">Offline actions will appear here.</p>
              </div>
            )}
          </section>

          {sync.conflicts.length ? (
            <section aria-labelledby="sync-conflicts-heading" className="space-y-3">
              <div>
                <h3 id="sync-conflicts-heading" className="font-medium">Conflicts</h3>
                <p className="text-sm text-muted-foreground">Physical quantity and location conflicts always require a person.</p>
              </div>
              <ul className="space-y-2">
                {sync.conflicts.map((conflict) => (
                  <li key={conflict.id} className="rounded-xl border border-destructive/35 bg-card p-3">
                    <p className="font-medium text-destructive">{conflict.title}</p>
                    <p className="mt-1 text-sm">{conflict.localSummary}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Current server record: {conflict.serverSummary}</p>
                    <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => void sync.discardConflict(conflict.id)}>Discard local action</Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-xs text-muted-foreground">Last successful sync check: {relativeTime(sync.lastSyncAt)}</p>
        </div>

        <SheetFooter className="border-t bg-background">
          {sync.updateAvailable ? <Button type="button" size="lg" variant="outline" onClick={sync.applyUpdate}><Download aria-hidden="true" data-icon="inline-start" />Apply update</Button> : null}
          <Button type="button" size="lg" onClick={() => void sync.syncNow()} disabled={sync.isSyncing || !sync.isOnline}>
            <RefreshCw aria-hidden="true" data-icon="inline-start" className={sync.isSyncing ? "animate-spin" : undefined} />
            {sync.isSyncing ? "Checking…" : "Sync now"}
          </Button>
          {pendingCount ? <Button type="button" size="lg" variant="ghost" onClick={() => void downloadJournal()}>Export recovery journal</Button> : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

