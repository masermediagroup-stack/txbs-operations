import type { Metadata } from "next"
import { CloudOff } from "lucide-react"

import { OfflineActions } from "@/app/offline/offline-actions"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

export const metadata: Metadata = { title: "Offline" }

// The public fallback needs request-matched CSP nonces for its reconnect control.
// The service worker can still cache this public response for offline navigation.
export const dynamic = "force-dynamic"

export default function OfflinePage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-svh items-center justify-center bg-muted/35 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader className="border-b-2 border-b-brand-orange">
          <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CloudOff aria-hidden="true" className="size-5" />
          </div>
          <h1 className="font-heading text-xl font-medium">You are offline</h1>
          <CardDescription>The page could not be opened without a connection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            The open Inventory screen can continue using device-local records, but a newly opened page requires a connection.
          </p>
          <OfflineActions />
        </CardContent>
      </Card>
    </main>
  )
}
