import type { Metadata } from "next"
import Link from "next/link"
import { CloudOff, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

export const metadata: Metadata = { title: "Offline" }

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
            Return to an Inventory screen that was already open to continue using device-local records. New pages and shared updates require a connection.
          </p>
          <Button render={<Link href="/inventory" />} nativeButton={false} size="lg" className="w-full">
            <RefreshCw aria-hidden="true" data-icon="inline-start" />
            Try Inventory again
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
