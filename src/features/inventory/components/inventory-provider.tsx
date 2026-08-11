"use client"

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

import type { InventorySnapshot } from "@/features/inventory/domain/inventory"
import { IndexedDbInventoryPersistence } from "@/features/inventory/repositories/indexeddb-inventory-persistence"
import { createInventoryService, type AddIssueCommentInput, type AddMaterialInput, type AssignIssueInput, type CancelOutboundBatchInput, type CreateOutboundBatchInput, type DepartOutboundBatchInput, type MarkOutboundReadyInput, type MoveMaterialInput, type RecordIssueInput, type ReverseMovementInput, type ReverseOutboundBatchInput, type SaveReceiptDraftInput, type TransitionIssueInput, type VerifyLotInput } from "@/features/inventory/services/inventory-service"

const SNAPSHOT_KEY = ["inventory", "snapshot"] as const

type InventoryContextValue = {
  snapshot: InventorySnapshot
  isHydrating: boolean
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

function InventoryState({ seed, children }: { seed: InventorySnapshot; children: ReactNode }) {
  const queryClient = useQueryClient()
  const service = useMemo(() => createInventoryService(new IndexedDbInventoryPersistence(), seed), [seed])
  const query = useQuery({ queryKey: SNAPSHOT_KEY, queryFn: service.load, initialData: seed, refetchOnMount: "always", staleTime: 0 })

  const apply = useCallback(async (operation: Promise<InventorySnapshot>) => {
    const snapshot = await operation
    queryClient.setQueryData(SNAPSHOT_KEY, snapshot)
    return snapshot
  }, [queryClient])

  const value = useMemo<InventoryContextValue>(() => ({
    snapshot: query.data,
    isHydrating: query.isFetching && query.data.revision === 0,
    addMaterial: async (input) => { await apply(service.addMaterial(input)) },
    verifyLot: async (input) => { await apply(service.verifyLot(input)) },
    recordIssue: async (input) => { await apply(service.recordIssue(input)) },
    assignIssue: async (input) => { await apply(service.assignIssue(input)) },
    addIssueComment: async (input) => { await apply(service.addIssueComment(input)) },
    transitionIssue: async (input) => { await apply(service.transitionIssue(input)) },
    saveReceiptDraft: async (input) => {
      const snapshot = await apply(service.saveReceiptDraft(input))
      const receipt = input.receiptId ? snapshot.receipts.find((item) => item.id === input.receiptId) : snapshot.receipts.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
      if (!receipt) throw new Error("Receipt draft was saved but could not be reopened.")
      return { receiptId: receipt.id, lineIds: receipt.lineIds }
    },
    completeReceipt: async (receiptId, operatorName) => { await apply(service.completeReceipt(receiptId, operatorName)) },
    moveMaterial: async (input) => { await apply(service.moveMaterial(input)) },
    reverseMovement: async (input) => { await apply(service.reverseMovement(input)) },
    createOutboundBatch: async (input) => { await apply(service.createOutboundBatch(input)) },
    markOutboundReady: async (input) => { await apply(service.markOutboundReady(input)) },
    departOutboundBatch: async (input) => { await apply(service.departOutboundBatch(input)) },
    cancelOutboundBatch: async (input) => { await apply(service.cancelOutboundBatch(input)) },
    reverseOutboundBatch: async (input) => { await apply(service.reverseOutboundBatch(input)) },
    exportBackup: service.exportBackup,
    importBackup: async (file) => { await apply(service.importBackup(file)) },
    getPhoto: service.getPhoto,
  }), [apply, query.data, query.isFetching, service])

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>
}

export function InventoryProvider({ seed, children }: { seed: InventorySnapshot; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={queryClient}><InventoryState seed={seed}>{children}</InventoryState></QueryClientProvider>
}

export function useInventory() {
  const value = useContext(InventoryContext)
  if (!value) throw new Error("useInventory must be used inside InventoryProvider.")
  return value
}
