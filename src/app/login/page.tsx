import type { Metadata } from "next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "@/features/auth/server/actions"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams

  return (
    <main id="main-content" className="flex min-h-svh items-center justify-center bg-muted/35 p-4" tabIndex={-1}>
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader className="border-b-2 border-b-brand-orange">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-blue">TBS Operations</p>
          <CardTitle>Sign in to the test workspace</CardTitle>
          <CardDescription>Use the temporary account provided by the TBS administrator.</CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? (
            <Alert variant="destructive" className="mb-5">
              <AlertTitle>Sign in unsuccessful</AlertTitle>
              <AlertDescription>Check your email and password, then try again.</AlertDescription>
            </Alert>
          ) : null}
          <form action={loginAction} className="space-y-5">
            <input type="hidden" name="next" value={params.next?.startsWith("/") ? params.next : "/"} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

