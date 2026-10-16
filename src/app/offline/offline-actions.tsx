"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function OfflineActions() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine)
    updateConnection()
    window.addEventListener("online", updateConnection)
    window.addEventListener("offline", updateConnection)
    return () => {
      window.removeEventListener("online", updateConnection)
      window.removeEventListener("offline", updateConnection)
    }
  }, [])

  if (isOnline) return (
    <Link href="/inventory" className={buttonVariants({ size: "lg", className: "w-full" })}>
      <RefreshCw aria-hidden="true" data-icon="inline-start" />
      Try Inventory again
    </Link>
  )

  return <p role="status" className="text-sm text-muted-foreground">Reconnect to open Inventory again. Work already saved on this device is retained.</p>
}
