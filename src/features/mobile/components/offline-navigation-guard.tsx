"use client"

import { useEffect, useState } from "react"
import { CloudOff, X } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Keep the already-open workspace usable when a new page cannot load offline. */
export function OfflineNavigationGuard() {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (navigator.onLine || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (!(event.target instanceof Element)) return
      const link = event.target.closest("a[href]")
      if (!link || link.hasAttribute("download") || (link.getAttribute("target") && link.getAttribute("target") !== "_self")) return

      const destination = new URL(link.getAttribute("href")!, window.location.href)
      if (destination.origin !== window.location.origin) return
      const current = new URL(window.location.href)
      if (destination.pathname === current.pathname && destination.search === current.search && destination.hash && destination.hash !== current.hash) return

      event.preventDefault()
      setBlocked(true)
    }
    const onOnline = () => setBlocked(false)

    document.addEventListener("click", onClick, true)
    window.addEventListener("online", onOnline)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  if (!blocked) return null
  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-lg items-start gap-3 rounded-xl border bg-background p-4 text-sm shadow-xl">
      <CloudOff aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <p className="flex-1">Stay on this page while offline. Reconnect before opening another section. Work waiting to sync remains on this device.</p>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Dismiss offline navigation notice" onClick={() => setBlocked(false)}>
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
