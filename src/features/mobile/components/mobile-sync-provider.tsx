"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import type { MobileCommandType, QueueMutationInput, QueuedActor, QueuedMutation, QueuedPhoto, SyncConflict } from "@/features/mobile/domain/mobile-sync"
import { IndexedDbMobileSyncPersistence } from "@/features/mobile/repositories/mobile-sync-persistence"
import { MobileSyncJournal } from "@/features/mobile/services/mobile-sync-journal"
import { prepareQueuedCommandPayload, sameOriginApiUrl } from "@/features/mobile/services/mobile-sync-transport"
import { uploadEvidence, type EvidenceTransfer } from "@/features/inventory/services/evidence-upload"
import { createClient as createSupabaseClient } from "@/lib/supabase/client"

import { hasLegacyDeviceData, withDeviceLock } from "@/features/mobile/repositories/scoped-database"
import { resolveReplayIdentities, type ReplayEntities } from "@/features/mobile/domain/replay-identity"
import { replayQueueDecision, requireReplaySession } from "@/features/mobile/domain/replay-guard"
import { parseFieldWorkCommand } from "@/features/field-work/domain/field-work"
import { parseInventoryCommand } from "@/features/inventory/domain/shared-command"

const SYNC_TAG = "tbs-operations-sync"

type SyncOperator = {
  id: string
  email: string
  displayName: string
  role: "Operator" | "Tech"
} | null

export type QueueCommandInput = Omit<QueueMutationInput, "actor" | "scope">

type StorageState = {
  usage: number | null
  quota: number | null
  persisted: boolean | null
}

type MobileSyncContextValue = {
  activeTransfers: EvidenceTransfer[]
  legacyDataLocked: boolean
  scope: string
  operator: SyncOperator
  retryConflict(id: string): Promise<void>
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
  queueCommand(input: QueueCommandInput, commit?: (mutation: QueuedMutation, photos: QueuedPhoto[]) => Promise<void>): Promise<QueuedMutation>
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

export function MobileSyncProvider({ children, operator, scope = "local" }: { children: ReactNode; operator: SyncOperator; scope?: string }) {
  const journal = useMemo(() => new MobileSyncJournal(new IndexedDbMobileSyncPersistence(scope)), [scope])
  const syncingRef = useRef(false)
  const identityRef = useRef(operator?.id)
  useEffect(() => { identityRef.current = operator?.id }, [operator])
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
  const [legacyDataLocked, setLegacyDataLocked] = useState(false)
  const [activeTransfers, setActiveTransfers] = useState<EvidenceTransfer[]>([])

  useEffect(() => {
    const update = (event: Event) => {
      const transfer = (event as CustomEvent<EvidenceTransfer>).detail
      setActiveTransfers((current) => [...current.filter((item) => item.id !== transfer.id), ...(transfer.phase === "uploading" ? [transfer] : [])])
    }
    window.addEventListener("tbs-evidence-transfer", update)
    return () => window.removeEventListener("tbs-evidence-transfer", update)
  }, [])
  const [storage, setStorage] = useState<StorageState>({ usage: null, quota: null, persisted: null })

  const refresh = useCallback(async () => {
    const snapshot = await journal.snapshot()
    setMutations(snapshot.mutations)
    setPhotos(snapshot.photos)
    setConflicts(snapshot.conflicts)
    setPreparedAt(snapshot.manifest?.preparedAt ?? null)
  }, [journal])

  useEffect(() => {
    if (!operator) return
    const { data } = createSupabaseClient().auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== operator.id) {
        identityRef.current = undefined
        window.location.replace("/login")
      }
    })
    return () => data.subscription.unsubscribe()
  }, [operator])

  const refreshStorage = useCallback(async () => {
    if (!navigator.storage) return
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate?.() ?? Promise.resolve({}),
      navigator.storage.persisted?.() ?? Promise.resolve(null),
    ])
    setStorage({ usage: estimate.usage ?? null, quota: estimate.quota ?? null, persisted })
  }, [])

  const syncNow = useCallback(async () => {
    if (!operator || syncingRef.current) return
    setSyncError(null)
    if (!navigator.onLine) {
      setSyncError("This device is offline. Pending work will remain on this device.")
      return
    }
    syncingRef.current = true
    setIsSyncing(true)
    try {
      await withDeviceLock(scope, async () => {
      const snapshot = await journal.snapshot()
      for (const original of snapshot.mutations.toSorted((left, right) => left.createdAt.localeCompare(right.createdAt))) {
        const current = await journal.snapshot()
        const mutation = current.mutations.find((entry) => entry.id === original.id)
        if (!mutation) continue
        if (identityRef.current !== operator.id) throw new Error("Queued work belongs to another account or environment and remains locked.")
        if (replayQueueDecision(mutation, current.mutations, current.conflicts, operator.id, scope) !== "ready") continue
        const session = await fetch("/api/auth/session", { cache: "no-store" }).then((response) => response.ok ? response.json() : null) as { userId: string } | null
        requireReplaySession(session?.userId, operator.id)
        const mutationPhotos = snapshot.photos.filter((photo) => photo.mutationId === mutation.id)
        const uploadById = new Map<string, { id: string; fileName: string }>()
        try {
          for (const photo of mutationPhotos) {
            const uploaded = await uploadEvidence({ commandId: mutation.clientMutationId, siteId: mutation.siteId, uploadId: photo.id, file: photo.blob, fileName: photo.fileName, actorId: operator.id })
            uploadById.set(photo.id, uploaded)
          }
          const payload = prepareQueuedCommandPayload(mutation.commandType, mutation.payload, uploadById)
          const endpoint = mutation.commandType.startsWith("field.")
            ? "/api/field-work/commands/v1"
            : "/api/inventory/commands/v1"
          const response = await fetch(sameOriginApiUrl(endpoint, window.location.href), {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-TBS-Actor": operator.id },
            body: JSON.stringify({ commandId: mutation.clientMutationId, commandType: mutation.commandType, siteId: mutation.siteId, payload }),
          })
          const body = await response.json().catch(() => ({ error: `The queued command returned HTTP ${response.status}.` })) as { error?: string; entityId?: string; entities?: ReplayEntities }
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
            await journal.markBlocked(mutation, body.error ?? "Shared record changed. Review the conflict before retrying.")
            break
          }
          if (!response.ok) throw new Error(body.error ?? "A queued action could not be synchronized.")
          await journal.completeMutation(mutation, resolveReplayIdentities(mutation, body.entities ?? { primary: body.entityId ? { entity: body.entityId } : {} }))
        } catch (cause) {
          const detail = cause instanceof Error ? cause.message : "The browser could not complete the request."
          const message = `This queued ${commandLabel(mutation.commandType).toLowerCase()} could not sync. ${detail}`
          await journal.markBlocked(mutation, message)
          setSyncError(message)
          break
        }
      }
      setLastSyncAt(new Date().toISOString())
      window.setTimeout(() => window.dispatchEvent(new Event("tbs-sync-complete")), 0)
      })
    } catch (cause) {
      setSyncError(cause instanceof Error ? cause.message : "Sync could not finish. Work remains on this device.")
    } finally {
      syncingRef.current = false
      setIsSyncing(false)
      await refresh()
    }
  }, [journal, operator, refresh, scope])

  useEffect(() => {
    const initialize = window.setTimeout(() => {
      setIsOnline(navigator.onLine)
      setIsSupported("serviceWorker" in navigator)
      void refresh()
      void refreshStorage()
      void hasLegacyDeviceData().then(setLegacyDataLocked).catch(() => undefined)
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

  const queueCommand = useCallback(async (input: QueueCommandInput, commit?: (mutation: QueuedMutation, photos: QueuedPhoto[]) => Promise<void>) => {
    return withDeviceLock(scope, async () => {
    const actor = actorSnapshot(operator)
    if (!operator && typeof input.payload.operatorName === "string" && input.payload.operatorName.trim()) actor.displayName = input.payload.operatorName.trim()
    const mutation = await journal.enqueue({ ...input, actor, scope }, async (entry, photos) => {
      if (!entry.commandType.startsWith("field.")) {
        const payload = prepareQueuedCommandPayload(entry.commandType, entry.payload, new Map(photos.map((photo) => [photo.id, { id: photo.id, fileName: photo.fileName }])))
        parseInventoryCommand({ commandId: entry.clientMutationId, commandType: entry.commandType, siteId: entry.siteId, payload })
      } else {
        parseFieldWorkCommand({ commandId: entry.clientMutationId, commandType: entry.commandType, siteId: entry.siteId, payload: { ...entry.payload, photoUploads: photos.map((photo) => ({ id: photo.id, fileName: photo.fileName })) } })
      }
      if (commit) await commit(entry, photos)
      else await new IndexedDbMobileSyncPersistence(scope).enqueue(entry, photos)
    })
    await refresh()
    const registration = registrationRef.current as RegistrationWithSync | null
    if (registration?.sync) await registration.sync.register(SYNC_TAG).catch(() => undefined)
    return mutation
    })
  }, [journal, operator, refresh, scope])

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
    try { await withDeviceLock(scope, () => journal.discardMutation(id)); await refresh() }
    catch (cause) { setSyncError(cause instanceof Error ? cause.message : "Could not discard this action.") }
  }, [journal, refresh, scope])

  const discardConflict = useCallback(async (id: string) => {
    try { await withDeviceLock(scope, () => journal.discardConflict(id)); await refresh() }
    catch (cause) { setSyncError(cause instanceof Error ? cause.message : "Could not discard this conflict.") }
  }, [journal, refresh, scope])

  const retryConflict = useCallback(async (id: string) => {
    try { await withDeviceLock(scope, () => journal.retryConflict(id)); await refresh() }
    catch (cause) { setSyncError(cause instanceof Error ? cause.message : "Could not retry this conflict.") }
  }, [journal, refresh, scope])

  const exportJournal = useCallback(() => withDeviceLock(scope, () => journal.export()), [journal, scope])

  const pendingEntityIds = useMemo(() => new Set(mutations.flatMap((mutation) => mutation.entityIds)), [mutations])
  const value = useMemo<MobileSyncContextValue>(() => ({
    activeTransfers,
    legacyDataLocked,
    scope,
    operator,
    retryConflict,
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
  }), [activeTransfers, legacyDataLocked, scope, retryConflict, applyUpdate, conflicts, discardConflict, discardMutation, exportJournal, isOnline, isSupported, isSyncing, lastSyncAt, mutations, operator, pendingEntityIds, photos, prepareDevice, preparedAt, queueCommand, registerInventoryCache, storage, syncError, syncNow, updateAvailable])

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
