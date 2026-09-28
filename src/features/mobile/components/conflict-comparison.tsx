"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { QueuedMutation } from "@/features/mobile/domain/mobile-sync"
import { conflictRecords } from "@/features/mobile/domain/conflict-comparison"

export function ConflictComparison({ mutation }: { mutation: QueuedMutation | undefined }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<{ records: Record<string, unknown[]>; checkedAt: string } | null>(null)

  async function compare() {
    if (!mutation) return
    setLoading(true)
    setError(null)
    setComparison(null)
    try {
      if (!navigator.onLine) throw new Error("Reconnect to compare with the shared records. Your saved work remains on this device.")
      const endpoint = mutation.commandType.startsWith("field.") ? "/api/field-work/snapshot" : "/api/inventory/snapshot"
      const response = await fetch(endpoint, { cache: "no-store" })
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in again to view the shared record." : "The shared record could not be loaded. Try again.")
      setComparison({ records: conflictRecords(await response.json(), mutation.entityIds), checkedAt: new Date().toLocaleString() })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The shared record could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  return <div className="mt-3 space-y-2 text-xs">
    <details><summary className="cursor-pointer py-2">Review retained command</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify({ expectedVersions: mutation?.entityBaseVersions, payload: mutation?.payload }, null, 2)}</pre></details>
    <Button type="button" variant="outline" className="min-h-11" disabled={loading || !mutation} onClick={() => void compare()}>{loading ? "Loading shared record…" : "Compare with shared record"}</Button>
    {error ? <p role="alert" className="text-destructive">{error}</p> : null}
    {comparison ? <div aria-live="polite" className="rounded-lg bg-muted p-3">
      <p className="font-medium">Shared records checked {comparison.checkedAt}</p>
      {Object.keys(comparison.records).length ? <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(comparison.records, null, 2)}</pre> : <p className="mt-2">No matching record is visible to this account. It may have been removed or may not have synchronized yet.</p>}
      <p className="mt-2">Retry preserves your original quantities and expected versions. If the shared record has changed, reconcile the physical work before discarding and recording a replacement action.</p>
    </div> : null}
  </div>
}
