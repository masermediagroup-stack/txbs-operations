"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import type { MobileCommandType, QueueMutationInput, QueuedActor, QueuedMutation, QueuedPhoto, SyncConflict } from "@/features/mobile/domain/mobile-sync"
import { IndexedDbMobileSyncPersistence } from "@/features/mobile/repositories/mobile-sync-persistence"
import { MobileSyncJournal } from "@/features/mobile/services/mobile-sync-journal"
import { prepareQueuedCommandPayload, queuedPhotoTicketRequest, sameOriginApiUrl } from "@/features/mobile/services/mobile-sync-transport"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"

const SYNC_TAG = "tbs-operations-sync"

type SyncOperator = {
  id: string
  email: string
  displayName: string
  role: "Operator" | "Tech"
} | null

type QueueCommandInput = Omit<QueueMutationInput, "actor">

type StorageState = {
  usage: number | null
  quota: number | null
  persisted: boolean | null
}

type MobileSyncContextValue = {
  isOnline: boolean
  isSupported: boolean
  isSyncing: boolean
  isSharedReplayAvailable: boolean
  updateAvailable: boolean
  preparedAt: string | null
  mutations: QueuedMutation[]
  photos: QueuedPhoto[]
  conflicts: SyncConflict[]
  pendingEntityIds: Set<string>
  lastSyncAt: string | null
  syncError: string | null
  storage: StorageState
  queueCommand(input: QueueCommandInput): Promise<QueuedMutation>
  syncNow(): Promise<void>
  prepareDevice(): Promise<void>
  registerInventoryCache(siteIds: string[], inventoryRevision: number): void
  applyUpdate(): void
  discardMutation(id: string): Promise<void>
  discardConflict(id: string): Promise<void>
  exportJournal(): Promise<Blob>
}

const MobileSyncContext = createContext<MobileSyncContextValue | null>(null)

type RegistrationWithSync = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void> }
}

function actorSnapshot(operator: SyncOperator): QueuedActor {
  return operator
    ? { userId: operator.id, email: operator.email, displayName: operator.displayName, role: operator.role }
    : { userId: null, email: null, displayName: "Local operator", role: null }
}

export function MobileSyncProvider({ children, operator }: { children: ReactNode; operator: SyncOperator }) {
  const journal = useMemo(() => new MobileSyncJournal(new IndexedDbMobileSyncPersistence()), [])
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const inventoryCacheRef = useRef({ siteIds: [] as string[], inventoryRevision: 0 })
  const [isOnline, setIsOnline] = useState(true)
  const [isSupported, setIsSupported] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [preparedAt, setPreparedAt] = useState<string | null>(null)
  const [mutations, setMutations] = useState<QueuedMutation[]>([])
  const [photos, setPhotos] = useState<QueuedPhoto[]>([])
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [storage, setStorage] = useState<StorageState>({ usage: null, quota: null, persisted: null })

  const refresh = useCallback(async () => {
    const snapshot = await journal.snapshot()
    setMutations(snapshot.mutations)
    setPhotos(snapshot.photos)
    setConflicts(snapshot.conflicts)
    setPreparedAt(snapshot.manifest?.preparedAt ?? null)
  }, [journal])

  const refreshStorage = useCallback(async () => {
    if (!navigator.storage) return
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate?.() ?? Promise.resolve({}),
      navigator.storage.persisted?.() ?? Promise.resolve(null),
    ])
    setStorage({ usage: estimate.usage ?? null, quota: estimate.quota ?? null, persisted })
  }, [])

  const syncNow = useCallback(async () => {
    setSyncError(null)
    if (!navigator.onLine) {
      setSyncError("This device is offline. Pending work will remain on this device.")
      return
    }
    setIsSyncing(true)
    try {
      const snapshot = await journal.snapshot()
      for (const mutation of snapshot.mutations.toSorted((left, right) => left.createdAt.localeCompare(right.createdAt))) {
        const mutationPhotos = snapshot.photos.filter((photo) => photo.mutationId === mutation.id)
        const uploadById = new Map<string, { id: string; fileName: string }>()
        try {
          for (const photo of mutationPhotos) {
            const ticketRequest = await queuedPhotoTicketRequest(photo, mutation.clientMutationId, mutation.siteId, window.location.href)
            const response = await fetch(ticketRequest.url, ticketRequest.init)
            const ticket = await response.json().catch(() => ({ error: `The queued photo ticket returned HTTP ${response.status}.` })) as { id?: string; fileName?: string; objectPath?: string; token?: string; upsert?: boolean; error?: string }
            if (!response.ok || !ticket.id || !ticket.fileName || !ticket.objectPath || !ticket.token) throw new Error(ticket.error ?? "A queued photo ticket could not be created.")
            const { error: uploadError } = await createSupabaseClient().storage
              .from("operational-media")
              .uploadToSignedUrl(ticket.objectPath, ticket.token, ticketRequest.bytes, { contentType: photo.contentType, upsert: ticket.upsert ?? false })
            if (uploadError) throw new Error(uploadError.message)
            uploadById.set(photo.id, { id: ticket.id, fileName: ticket.fileName })
          }
          const payload = prepareQueuedCommandPayload(mutation.commandType, mutation.payload, uploadById)
          const endpoint = mutation.commandType.startsWith("field.")
            ? "/api/field-work/commands/v1"
            : "/api/inventory/commands/v1"
          const response = await fetch(sameOriginApiUrl(endpoint, window.location.href), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commandId: mutation.clientMutationId, commandType: mutation.commandType, siteId: mutation.siteId, payload }),
          })
          const body = await response.json().catch(() => ({ error: `The queued command returned HTTP ${response.status}.` })) as { error?: string }
          if (response.status === 409) {
            await journal.addConflict({
              id: crypto.randomUUID(),
              mutationId: mutation.id,
              commandType: mutation.commandType,
              entityId: mutation.entityIds[0] ?? null,
              title: "Shared record changed",
              localSummary: `${mutation.actor.displayName} queued this action on ${new Date(mutation.createdAt).toLocaleString()}.`,
              serverSummary: body.error ?? "The shared version is newer than this device's cached version.",
              createdAt: new Date().toISOString(),
            })
            await journal.completeMutation(mutation)
            continue
          }
          if (!response.ok) throw new Error(body.error ?? "A queued action could not be synchronized.")
          await journal.completeMutation(mutation)
        } catch (cause) {
          const detail = cause instanceof Error ? cause.message : "The browser could not complete the request."
          const message = `This queued ${commandLabel(mutation.commandType).toLowerCase()} could not sync. ${detail}`
          await journal.markBlocked(mutation, message)
          setSyncError(message)
          break
        }
      }
      setLastSyncAt(new Date().toISOString())
    } finally {
      setIsSyncing(false)
      await refresh()
    }
  }, [journal, refresh])

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      setIsOnline(navigator.onLine)
      setIsSupported("serviceWorker" in navigator)
      void refresh()
      void refreshStorage()
    }, 0)

    const online = () => {
      setIsOnline(true)
      void syncNow()
    }
    const offline = () => setIsOnline(false)
    window.addEventListener("online", online)
    window.addEventListener("offline", offline)
    return () => {
      window.clearTimeout(initialize)
      window.removeEventListener("online", online)
      window.removeEventListener("offline", offline)
    }
  }, [refresh, refreshStorage, syncNow])

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.all(
          registrations
            .filter((registration) => registration.scope === `${window.location.origin}/`)
            .map((registration) => registration.unregister()),
        )

        if ("caches" in window) {
          const cacheNames = await window.caches.keys()
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith("tbs-yard-"))
              .map((cacheName) => window.caches.delete(cacheName)),
          )
        }
      })
      return
    }

    let cancelled = false

    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registration) => {
      if (cancelled) return
      registrationRef.current = registration
      setUpdateAvailable(Boolean(registration.waiting))
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdateAvailable(true)
        })
      })
    }).catch(() => setIsSupported(false))

    const message = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "TBS_SYNC_REQUESTED") void syncNow()
    }
    navigator.serviceWorker.addEventListener("message", message)
    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener("message", message)
    }
  }, [syncNow])

  const queueCommand = useCallback(async (input: QueueCommandInput) => {
    const actor = actorSnapshot(operator)
    if (!operator && typeof input.payload.operatorName === "string" && input.payload.operatorName.trim()) actor.displayName = input.payload.operatorName.trim()
    const mutation = await journal.enqueue({ ...input, actor })
    await refresh()
    const registration = registrationRef.current as RegistrationWithSync | null
    if (registration?.sync) await registration.sync.register(SYNC_TAG).catch(() => undefined)
    return mutation
  }, [journal, operator, refresh])

  const prepareDevice = useCallback(async () => {
    setSyncError(null)
    try {
      await navigator.storage?.persist?.()
      await journal.prepare({ userId: operator?.id ?? null, ...inventoryCacheRef.current })
      await Promise.all([refresh(), refreshStorage()])
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : "This device could not be prepared for offline work.")
    }
  }, [journal, operator, refresh, refreshStorage])

  const registerInventoryCache = useCallback((siteIds: string[], inventoryRevision: number) => {
    inventoryCacheRef.current = { siteIds, inventoryRevision }
  }, [])

  const applyUpdate = useCallback(() => {
    const waiting = registrationRef.current?.waiting
    if (!waiting) return
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true })
    waiting.postMessage({ type: "SKIP_WAITING" })
  }, [])

  const discardMutation = useCallback(async (id: string) => {
    await journal.discardMutation(id)
    await refresh()
  }, [journal, refresh])

  const discardConflict = useCallback(async (id: string) => {
    await journal.discardConflict(id)
    await refresh()
  }, [journal, refresh])

  const exportJournal = useCallback(() => journal.export(), [journal])

  const pendingEntityIds = useMemo(() => new Set(mutations.flatMap((mutation) => mutation.entityIds)), [mutations])
  const value = useMemo<MobileSyncContextValue>(() => ({
    isOnline,
    isSupported,
    isSyncing,
    isSharedReplayAvailable: Boolean(operator),
    updateAvailable,
    preparedAt,
    mutations,
    photos,
    conflicts,
    pendingEntityIds,
    lastSyncAt,
    syncError,
    storage,
    queueCommand,
    syncNow,
    prepareDevice,
    registerInventoryCache,
    applyUpdate,
    discardMutation,
    discardConflict,
    exportJournal,
  }), [applyUpdate, conflicts, discardConflict, discardMutation, exportJournal, isOnline, isSupported, isSyncing, lastSyncAt, mutations, operator, pendingEntityIds, photos, prepareDevice, preparedAt, queueCommand, registerInventoryCache, storage, syncError, syncNow, updateAvailable])

  return <MobileSyncContext.Provider value={value}>{children}</MobileSyncContext.Provider>
}

export function useMobileSync() {
  const context = useContext(MobileSyncContext)
  if (!context) throw new Error("useMobileSync must be used inside MobileSyncProvider.")
  return context
}

export function commandLabel(commandType: MobileCommandType) {
  const labels: Record<MobileCommandType, string> = {
    "project.status.update": "Change project stage",
    "material.add": "Add project material",
    "verification.confirm": "Confirm material",
    "receipt.save-draft": "Save receiving draft",
    "receipt.complete": "Complete receiving",
    "movement.create": "Move material",
    "movement.reverse": "Reverse movement",
    "issue.record": "Record issue",
    "issue.assign": "Assign issue",
    "issue.comment": "Add issue follow-up",
    "issue.transition": "Change issue status",
    "outbound.plan": "Plan outbound material",
    "outbound.ready": "Mark outbound ready",
    "outbound.depart": "Record outbound departure",
    "outbound.cancel": "Cancel outbound batch",
    "outbound.reverse": "Reverse outbound departure",
    "field.assignment.start": "Start assigned work",
    "field.installation.confirm": "Confirm installation",
  }
  return labels[commandType]
}
