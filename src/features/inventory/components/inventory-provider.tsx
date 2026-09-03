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
import { useMobileSync } from "@/features/mobile/components/mobile-sync-provider"

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
  const { isOnline, queueCommand, registerInventoryCache } = useMobileSync()
  const persistence = useMemo(() => new IndexedDbInventoryPersistence(), [])
  const localService = useMemo(() => createInventoryService(persistence, seed), [persistence, seed])
  const remoteService = useMemo(() => createRemoteInventoryService(
    () => queryClient.getQueryData<InventorySnapshot>(SNAPSHOT_KEY) ?? seed,
  ), [queryClient, seed])
  const service = backend === "supabase" && isOnline ? remoteService : localService
  const query = useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: service.load,
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
    if (backend !== "supabase" || !isOnline || !query.data) return
    void persistence.getAllPhotos().then((photos) => persistence.replace(query.data, photos))
  }, [backend, isOnline, persistence, query.data])

  const queueOffline = useCallback(async (input: Parameters<typeof queueCommand>[0]) => {
    if (isOnline) return
    await queueCommand(input)
  }, [isOnline, queueCommand])

  const value = useMemo<InventoryContextValue>(() => ({
    snapshot,
    isHydrating: query.isFetching && snapshot.revision === 0,
    updateProjectStatus: async (input) => {
      const project = snapshot.projects.find((item) => item.id === input.projectId)
      await apply(service.updateProjectStatus(input))
      if (project) await queueOffline({
        clientMutationId: input.clientMutationId,
        commandType: "project.status.update",
        siteId: project.siteId,
        entityIds: [project.id],
        entityBaseVersions: { [project.id]: input.expectedVersion },
        payload: input as unknown as Record<string, unknown>,
      })
    },
    addMaterial: async (input) => {
      const project = snapshot.projects.find((item) => item.id === input.projectId)
      await apply(service.addMaterial(input))
      if (project) await queueOffline({ commandType: "material.add", siteId: project.siteId, entityIds: [input.projectId], payload: input as unknown as Record<string, unknown> })
    },
    verifyLot: async (input) => {
      const lot = snapshot.lots.find((item) => item.id === input.lotId)
      await apply(service.verifyLot(input))
      if (lot) await queueOffline({ commandType: "verification.confirm", siteId: lot.siteId, entityIds: [lot.id], entityBaseVersions: { [lot.id]: lot.version }, payload: input as unknown as Record<string, unknown> })
    },
    recordIssue: async (input) => {
      await apply(service.recordIssue(input))
      await queueOffline({ clientMutationId: input.clientMutationId, commandType: "issue.record", siteId: input.siteId, entityIds: [input.projectId, input.lotId, input.receiptId, input.locationId, input.movementId, input.outboundBatchId].filter((id): id is string => Boolean(id)), payload: input as unknown as Record<string, unknown> })
    },
    assignIssue: async (input) => {
      const issue = snapshot.issues.find((item) => item.id === input.issueId)
      await apply(service.assignIssue(input))
      if (issue) await queueOffline({ commandType: "issue.assign", siteId: issue.siteId, entityIds: [issue.id], payload: input as unknown as Record<string, unknown> })
    },
    addIssueComment: async (input) => {
      const issue = snapshot.issues.find((item) => item.id === input.issueId)
      await apply(service.addIssueComment(input))
      if (issue) await queueOffline({ commandType: "issue.comment", siteId: issue.siteId, entityIds: [issue.id], payload: input as unknown as Record<string, unknown> })
    },
    transitionIssue: async (input) => {
      const issue = snapshot.issues.find((item) => item.id === input.issueId)
      await apply(service.transitionIssue(input))
      if (issue) await queueOffline({ commandType: "issue.transition", siteId: issue.siteId, entityIds: [issue.id], payload: input as unknown as Record<string, unknown> })
    },
    saveReceiptDraft: async (input) => {
      const snapshot = await apply(service.saveReceiptDraft(input))
      const receipt = input.receiptId ? snapshot.receipts.find((item) => item.id === input.receiptId) : snapshot.receipts.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
      if (!receipt) throw new Error("Receipt draft was saved but could not be reopened.")
      await queueOffline({ commandType: "receipt.save-draft", siteId: input.siteId, entityIds: [receipt.id, input.projectId].filter((id): id is string => Boolean(id)), payload: { ...input, receiptId: receipt.id, lines: input.lines.map((line, index) => ({ ...line, id: receipt.lineIds[index] })) } as unknown as Record<string, unknown> })
      return { receiptId: receipt.id, lineIds: receipt.lineIds }
    },
    completeReceipt: async (receiptId, operatorName) => {
      const receipt = snapshot.receipts.find((item) => item.id === receiptId)
      await apply(service.completeReceipt(receiptId, operatorName))
      if (receipt) await queueOffline({ commandType: "receipt.complete", siteId: receipt.siteId, entityIds: [receipt.id, receipt.projectId].filter((id): id is string => Boolean(id)), payload: { receiptId, operatorName } })
    },
    moveMaterial: async (input) => {
      const lots = input.lines.map((line) => snapshot.lots.find((lot) => lot.id === line.lotId)).filter((lot): lot is NonNullable<typeof lot> => Boolean(lot))
      await apply(service.moveMaterial(input))
      if (lots[0]) await queueOffline({ clientMutationId: input.clientMutationId, commandType: "movement.create", siteId: lots[0].siteId, entityIds: lots.map((lot) => lot.id), entityBaseVersions: Object.fromEntries(input.lines.map((line) => [line.lotId, line.expectedVersion])), payload: input as unknown as Record<string, unknown> })
    },
    reverseMovement: async (input) => {
      const movement = snapshot.movements.find((item) => item.id === input.movementId)
      await apply(service.reverseMovement(input))
      if (movement) await queueOffline({ clientMutationId: input.clientMutationId, commandType: "movement.reverse", siteId: movement.siteId, entityIds: [movement.id], payload: input as unknown as Record<string, unknown> })
    },
    createOutboundBatch: async (input) => {
      const project = snapshot.projects.find((item) => item.id === input.projectId)
      await apply(service.createOutboundBatch(input))
      if (project) await queueOffline({ clientMutationId: input.clientMutationId, commandType: "outbound.plan", siteId: project.siteId, entityIds: [project.id, ...input.lines.map((line) => line.lotId)], entityBaseVersions: Object.fromEntries(input.lines.map((line) => [line.lotId, line.expectedVersion])), payload: input as unknown as Record<string, unknown> })
    },
    markOutboundReady: async (input) => {
      const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
      await apply(service.markOutboundReady(input))
      if (batch) await queueOffline({ clientMutationId: input.clientMutationId, commandType: "outbound.ready", siteId: batch.siteId, entityIds: [batch.id], payload: input as unknown as Record<string, unknown> })
    },
    departOutboundBatch: async (input) => {
      const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
      await apply(service.departOutboundBatch(input))
      if (batch) await queueOffline({ clientMutationId: input.clientMutationId, commandType: "outbound.depart", siteId: batch.siteId, entityIds: [batch.id], payload: input as unknown as Record<string, unknown> })
    },
    cancelOutboundBatch: async (input) => {
      const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
      await apply(service.cancelOutboundBatch(input))
      if (batch) await queueOffline({ clientMutationId: input.clientMutationId, commandType: "outbound.cancel", siteId: batch.siteId, entityIds: [batch.id], payload: input as unknown as Record<string, unknown> })
    },
    reverseOutboundBatch: async (input) => {
      const batch = snapshot.outboundBatches.find((item) => item.id === input.batchId)
      await apply(service.reverseOutboundBatch(input))
      if (batch) await queueOffline({ clientMutationId: input.clientMutationId, commandType: "outbound.reverse", siteId: batch.siteId, entityIds: [batch.id], payload: input as unknown as Record<string, unknown> })
    },
    exportBackup: service.exportBackup,
    importBackup: async (file) => { await apply(service.importBackup(file)) },
    getPhoto: service.getPhoto,
  }), [apply, query.isFetching, queueOffline, service, snapshot])

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
