"use client"

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { InventorySnapshot } from "@/features/inventory/domain/inventory"
import { IndexedDbInventoryPersistence } from "@/features/inventory/repositories/indexeddb-inventory-persistence"
import { createInventoryService, type AddIssueCommentInput, type AddMaterialInput, type AssignIssueInput, type CancelOutboundBatchInput, type CreateOutboundBatchInput, type DepartOutboundBatchInput, type MarkOutboundReadyInput, type MoveMaterialInput, type RecordIssueInput, type ReverseMovementInput, type ReverseOutboundBatchInput, type SaveReceiptDraftInput, type TransitionIssueInput, type UpdateProjectStatusInput, type VerifyLotInput } from "@/features/inventory/services/inventory-service"
import { createRemoteInventoryService } from "@/features/inventory/services/remote-inventory-service"
import { useMobileSync, type QueueCommandInput } from "@/features/mobile/components/mobile-sync-provider"
import { withDeviceLock } from "@/features/mobile/repositories/scoped-database"
import { IndexedDbMobileSyncPersistence } from "@/features/mobile/repositories/mobile-sync-persistence"

const SNAPSHOT_KEY = ["inventory", "snapshot"] as const

export function initialInventorySnapshot(backend: "local" | "supabase", seed: InventorySnapshot) {
  return backend === "local" ? seed : undefined
}

type InventoryContextValue = {
  snapshot: InventorySnapshot
  isHydrating: boolean
  updateProjectStatus(input: UpdateProjectStatusInput): Promise<void>
  addMaterial(input: AddMaterialInput): Promise<void>
  verifyLot(input: VerifyLotInput): Promise<void>
  recordIssue(input: RecordIssueInput): Promise<void>
  assignIssue(input: AssignIssueInput): Promise<void>
  addIssueComment(input: AddIssueCommentInput): Promise<void>
  transitionIssue(input: TransitionIssueInput): Promise<void>
  saveReceiptDraft(input: SaveReceiptDraftInput): Promise<{ receiptId: string; lineIds: string[] }>
  completeReceipt(receiptId: string, operatorName: string): Promise<void>
  moveMaterial(input: MoveMaterialInput): Promise<void>
  reverseMovement(input: ReverseMovementInput): Promise<void>
  createOutboundBatch(input: CreateOutboundBatchInput): Promise<void>
  markOutboundReady(input: MarkOutboundReadyInput): Promise<void>
  departOutboundBatch(input: DepartOutboundBatchInput): Promise<void>
  cancelOutboundBatch(input: CancelOutboundBatchInput): Promise<void>
  reverseOutboundBatch(input: ReverseOutboundBatchInput): Promise<void>
  exportBackup(): Promise<Blob>
  importBackup(file: File): Promise<void>
  getPhoto(key: string): Promise<Blob | null>
}

const InventoryContext = createContext<InventoryContextValue | null>(null)

function InventoryState({ seed, backend, children }: { seed: InventorySnapshot; backend: "local" | "supabase"; children: ReactNode }) {
  const queryClient = useQueryClient()
  const { isOnline, queueCommand, registerInventoryCache, scope, mutations } = useMobileSync()
  const persistence = useMemo(() => new IndexedDbInventoryPersistence(scope), [scope])
  const journalPersistence = useMemo(() => new IndexedDbMobileSyncPersistence(scope), [scope])
  const localService = useMemo(() => createInventoryService(persistence, seed), [persistence, seed])
  const remoteService = useMemo(() => createRemoteInventoryService(
    () => queryClient.getQueryData<InventorySnapshot>(SNAPSHOT_KEY) ?? seed,
  ), [queryClient, seed])
  const service = backend === "supabase" && isOnline ? remoteService : localService
  const query = useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: async () => {
      // On reload the React journal state may not have hydrated yet.
      const pending = backend === "supabase" ? await journalPersistence.listMutations() : []
      return backend === "supabase" && (!navigator.onLine || pending.length > 0) ? persistence.requirePreparedSnapshot() : service.load()
    },
    networkMode: "always",
    initialData: initialInventorySnapshot(backend, seed),
    refetchOnMount: "always",
    staleTime: 0,
  })
  const snapshot = query.data ?? seed

  const apply = useCallback(async (operation: Promise<InventorySnapshot>) => {
    const snapshot = await operation
    queryClient.setQueryData(SNAPSHOT_KEY, snapshot)
    return snapshot
  }, [queryClient])

  useEffect(() => {
    if (!query.data) return
    registerInventoryCache(query.data.sites.map((site) => site.id), query.data.revision)
  }, [query.data, registerInventoryCache])

  useEffect(() => {
    if (backend !== "supabase" || !isOnline || !query.data || mutations.length) return
    void withDeviceLock(scope, async () => {
      if ((await journalPersistence.listMutations()).length) return
      await persistence.cacheSharedSnapshot(query.data)
    }).catch(() => undefined)
  }, [backend, isOnline, journalPersistence, mutations.length, persistence, query.data, scope])

  useEffect(() => {
    if (backend === "supabase") void queryClient.invalidateQueries({ queryKey: SNAPSHOT_KEY })
  }, [backend, isOnline, queryClient])

  useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries() }
    window.addEventListener("tbs-sync-complete", refresh)
    return () => window.removeEventListener("tbs-sync-complete", refresh)
  }, [queryClient])

  const execute = useCallback(async (input: QueueCommandInput | null, operation: () => Promise<InventorySnapshot>) => {
    if (isOnline) {
      if (backend === "supabase" && mutations.length) throw new Error("Sync or resolve pending work before making another shared change.")
      return apply(operation())
    }
    if (!input) throw new Error("The record is unavailable. Reconnect and refresh before changing it.")
    let next: InventorySnapshot | undefined
    await queueCommand(input, (mutation, photos) => persistence.withQueuedCommand(mutation, photos, async () => { next = await operation() }))
    if (!next) throw new Error("This action is already queued. Refresh its status before repeating it.")
    queryClient.setQueryData(SNAPSHOT_KEY, next)
    return next
  }, [apply, backend, isOnline, mutations.length, persistence, queryClient, queueCommand])

  const value = useMemo<InventoryContextValue>(() => ({
    snapshot,
    isHydrating: query.isFetching && snapshot.revision === 0,
    updateProjectStatus: async (input) => {
      const project = snapshot.projects.find((item) => item.id === input.projectId)
      await execute(project ? {
        clientMutationId: input.clientMutationId,
        commandType: "project.status.update",
        siteId: project.siteId,
        entityIds: [project.id],
        entityBaseVersions: { [project.id]: input.expectedVersion },
        payload: input as unknown as Record<string, unknown>,
      } : null, () => service.updateProjectStatus(input))
    },
    addMaterial: async (input) => {
      const project = snapshot.projects.find((item) => item.id === input.projectId)
      await execute(project ? { commandType: "material.add", siteId: project.siteId, entityIds: [input.projectId], payload: input as unknown as Record<string, unknown> } : null, () => service.addMaterial(input))
    },
    verifyLot: async (input) => {
      const lot = snapshot.lots.find((item) => item.id === input.lotId)
      await execute(lot ? { commandType: "verification.confirm", siteId: lot.siteId, entityIds: [lot.id], entityBaseVersions: { [lot.id]: lot.version }, payload: { ...input, expectedVersion: lot.version } as unknown as Record<string, unknown> } : null, () => service.verifyLot(input))
    },
    recordIssue: async (input) => {
      await execute({ clientMutationId: input.clientMutationId, commandType: "issue.record", siteId: input.siteId, entityIds: [input.projectId, input.lotId, input.receiptId, input.locationId, input.movementId, input.outboundBatchId].filter((id): id is string => Boolean(id)), payload: input as unknown as Record<string, unknown> }, () => service.recordIssue(input))
    },
    assignIssue: async (input) => {
      const issue = snapshot.issues.find((item) => item.id === input.issueId)
      await execute(issue ? { commandType: "issue.assign", siteId: issue.siteId, entityIds: [issue.id], payload: input as unknown as Record<string, unknown> } : null, () => service.assignIssue(input))
    },
    addIssueComment: async (input) => {
      const issue = snapshot.issues.find((item) => item.id === input.issueId)
      await execute(issue ? { commandType: "issue.comment", siteId: issue.siteId, entityIds: [issue.id], payload: input as unknown as Record<string, unknown> } : null, () => service.addIssueComment(input))
    },
    transitionIssue: async (input) => {
      const issue = snapshot.issues.find((item) => item.id === input.issueId)
      await execute(issue ? { commandType: "issue.transition", siteId: issue.siteId, entityIds: [issue.id], payload: input as unknown as Record<string, unknown> } : null, () => service.transitionIssue(input))
    },
    saveReceiptDraft: async (input) => {
      const stable = { ...input, receiptId: input.receiptId ?? crypto.randomUUID(), lines: input.lines.map((line) => ({ ...line, id: line.id ?? crypto.randomUUID() })) }
      const updated = await execute({ commandType: "receipt.save-draft", siteId: stable.siteId, entityIds: [stable.receiptId], payload: stable as unknown as Record<string, unknown> }, () => service.saveReceiptDraft(stable))
      const receipt = updated.receipts.find((item) => item.id === stable.receiptId)
      if (!receipt) throw new Error("Receipt draft was saved but could not be reopened.")
      return { receiptId: receipt.id, lineIds: receipt.lineIds }
    },
    completeReceipt: async (receiptId, operatorName) => {
      const current = queryClient.getQueryData<InventorySnapshot>(SNAPSHOT_KEY) ?? snapshot
      const receipt = current.receipts.find((item) => item.id === receiptId)
      await execute(receipt ? { commandType: "receipt.complete", siteId: receipt.siteId, entityIds: [receipt.id], payload: { receiptId, operatorName } } : null, () => service.completeReceipt(receiptId, operatorName))
    },
    moveMaterial: async (input) => {
      const lots = input.lines.map((line) => snapshot.lots.find((lot) => lot.id === line.lotId)).filter((lot): lot is NonNullable<typeof lot> => Boolean(lot))
      await execute(lots[0] ? { clientMutationId: input.clientMutationId, commandType: "movement.create", siteId: lots[0].siteId, entityIds: lots.map((lot) => lot.id), entityBaseVersions: Object.fromEntries(input.lines.map((line) => [line.lotId, line.expectedVersion])), payload: input as unknown as Record<string, unknown> } : null, () => service.moveMaterial(input))
    },
    reverseMovement: async (input) => {
      const movement = snapshot.movements.find((item) => item.id === input.movementId)
      await execute(movement ? { clientMutationId: input.clientMutationId, commandType: "movement.reverse", siteId: movement.siteId, entityIds: [movement.id], payload: input as unknown as Record<string, unknown> } : null, () => service.reverseMovement(input))
    },
    createOutboundBatch: async (input) => {
      const project = snapshot.projects.find((item) => item.id === input.projectId)
      await execute(project ? { clientMutationId: input.clientMutationId, commandType: "outbound.plan", siteId: project.siteId, entityIds: [project.id, ...input.lines.map((line) => line.lotId)], entityBaseVersions: Object.fromEntries(input.lines.map((line) => [line.lotId, line.expectedVersion])), payload: input as unknown as Record<string, unknown> } : null, () => service.createOutboundBatch(input))
    },
    markOutboundReady: async (input) => {
      const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
      await execute(batch ? { clientMutationId: input.clientMutationId, commandType: "outbound.ready", siteId: batch.siteId, entityIds: [batch.id], payload: input as unknown as Record<string, unknown> } : null, () => service.markOutboundReady(input))
    },
    departOutboundBatch: async (input) => {
      const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
      await execute(batch ? { clientMutationId: input.clientMutationId, commandType: "outbound.depart", siteId: batch.siteId, entityIds: [batch.id], payload: input as unknown as Record<string, unknown> } : null, () => service.departOutboundBatch(input))
    },
    cancelOutboundBatch: async (input) => {
      const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
      await execute(batch ? { clientMutationId: input.clientMutationId, commandType: "outbound.cancel", siteId: batch.siteId, entityIds: [batch.id], payload: input as unknown as Record<string, unknown> } : null, () => service.cancelOutboundBatch(input))
    },
    reverseOutboundBatch: async (input) => {
      const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
      await execute(batch ? { clientMutationId: input.clientMutationId, commandType: "outbound.reverse", siteId: batch.siteId, entityIds: [batch.id], payload: input as unknown as Record<string, unknown> } : null, () => service.reverseOutboundBatch(input))
    },
    exportBackup: service.exportBackup,
    importBackup: async (file) => { await apply(service.importBackup(file)) },
    getPhoto: service.getPhoto,
  }), [apply, execute, query.isFetching, queryClient, service, snapshot])

  if (!query.data) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10 sm:px-6">
        {query.isError ? (
          <Alert variant="destructive" className="p-4">
            <AlertTriangle aria-hidden="true" className="size-5" />
            <AlertTitle>Shared Inventory could not be loaded</AlertTitle>
            <AlertDescription className="mt-1">
              No changes can be made until the shared workspace reconnects. Your bundled demonstration records are not being shown as live data.
              <Button type="button" variant="outline" size="sm" className="mt-4 w-fit" onClick={() => void query.refetch()} disabled={query.isFetching}>
                <RefreshCw aria-hidden="true" className={query.isFetching ? "animate-spin" : undefined} />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl border bg-card p-8 text-sm text-muted-foreground" role="status">
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            Loading shared workspace…
          </div>
        )}
      </div>
    )
  }

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}

export function InventoryProvider({ seed, backend = "local", children }: { seed: InventorySnapshot; backend?: "local" | "supabase"; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={queryClient}><InventoryState seed={seed} backend={backend}>{children}</InventoryState></QueryClientProvider>
}

export function useInventory() {
  const value = useContext(InventoryContext)
  if (!value) throw new Error("useInventory must be used inside InventoryProvider.")
  return value
}
