import { logoutAction } from "@/features/auth/server/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AccessPendingPage() {
  return (
    <main id="main-content" className="flex min-h-svh items-center justify-center bg-muted/35 p-4" tabIndex={-1}>
      <Card className="w-full max-w-lg overflow-hidden">
        <CardHeader className="border-b-2 border-b-brand-orange">
          <CardTitle>Access is waiting for approval</CardTitle>
          <CardDescription>Your account is signed in, but it has not been activated for a TBS site.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-5 text-sm text-muted-foreground">Ask a TBS administrator to activate your profile and assign the Lavon Yard.</p>
          <form action={logoutAction}><Button variant="outline" type="submit">Sign out</Button></form>
        </CardContent>
      </Card>
    </main>
  )
}
