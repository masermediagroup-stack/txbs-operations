import type { Metadata } from "next"
import Image from "next/image"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginAction } from "@/features/auth/server/actions"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams
  const returnPath = params.next?.startsWith("/") ? params.next : "/"

  return (
    <main
      id="main-content"
      className="flex min-h-svh items-center justify-center bg-muted p-4 sm:p-6 md:p-10"
      tabIndex={-1}
    >
      <Card className="w-full max-w-sm overflow-hidden p-0 shadow-xl md:max-w-4xl">
        <CardContent className="grid p-0 md:min-h-145 md:grid-cols-2">
          <form action={loginAction} className="flex items-center p-6 sm:p-8 md:p-12">
            <FieldGroup className="mx-auto max-w-sm gap-6">
              <div className="border-b-2 border-brand-orange pb-6">
                <h1 className="font-heading text-3xl font-semibold tracking-tight text-pretty">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Sign in with your company-provided account to continue.
                </p>
              </div>

              {params.error ? (
                <Alert variant="destructive">
                  <AlertTitle>Sign in unsuccessful</AlertTitle>
                  <AlertDescription>Check your email and password, then try again.</AlertDescription>
                </Alert>
              ) : null}

              <input type="hidden" name="next" value={returnPath} />

              <Field>
                <FieldLabel htmlFor="email">Company email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@texasbuildingspecialties.com"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                />
              </Field>

              <Field>
                <Button type="submit" className="w-full">
                  Sign in
                </Button>
              </Field>

              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Need account help? Contact your TBS administrator.
              </p>
            </FieldGroup>
          </form>

          <div className="relative hidden overflow-hidden bg-primary md:flex md:items-center md:justify-center md:p-12">
            <div className="absolute inset-x-0 top-0 h-1 bg-brand-orange" aria-hidden="true" />
            <div className="relative flex aspect-square w-full max-w-80 items-center justify-center rounded-3xl bg-card p-10 shadow-2xl">
              <Image
                src="/images/brand/tbs-logo.png"
                alt="Texas Building Specialties"
                width={420}
                height={318}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
