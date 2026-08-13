import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { configureProfileAction } from "@/features/auth/server/administration-actions"
import { getCurrentOperator } from "@/features/auth/server/session"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Administration" }
export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const operator = await getCurrentOperator()
  if (!operator) redirect("/login?next=/administration")
  const params = await searchParams
  const supabase = await createClient()
  const [{ data: profiles }, { data: memberships }, { data: sites }] = await Promise.all([
    supabase.from("profiles").select("*").order("display_name"),
    supabase.from("site_memberships").select("*").order("created_at"),
    supabase.from("sites").select("*").eq("active", true).order("name"),
  ])

  if (operator.role !== "Administrator") {
    return <Alert><AlertTitle>Administrator access required</AlertTitle><AlertDescription>Your account can use its assigned operational sites but cannot change users or roles.</AlertDescription></Alert>
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">Activate temporary Supabase test accounts and assign their demo permissions.</p>
      </div>
      {params.saved ? <Alert><AlertTitle>Account updated</AlertTitle><AlertDescription>The role and site assignment are active in the shared workspace.</AlertDescription></Alert> : null}
      {params.error ? <Alert variant="destructive"><AlertTitle>Account not updated</AlertTitle><AlertDescription>{params.error}</AlertDescription></Alert> : null}
      <Card>
        <CardHeader className="border-b-2 border-b-brand-orange">
          <CardTitle>Temporary demo accounts</CardTitle>
          <CardDescription>Create the email/password identity in Supabase Auth first. It appears here inactive, then an Administrator activates it and assigns a role.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {(profiles ?? []).map((profile) => {
            const membership = (memberships ?? []).find((item) => item.user_id === profile.id && item.active)
            const role = profile.system_role === "Administrator" ? "Administrator" : membership?.role ?? "Operator"
            return (
              <form action={configureProfileAction} key={profile.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_11rem_13rem_auto] lg:items-end">
                <input type="hidden" name="userId" value={profile.id} />
                <div className="grid gap-2"><Label htmlFor={`name-${profile.id}`}>Display name</Label><Input id={`name-${profile.id}`} name="displayName" defaultValue={profile.display_name} required /></div>
                <div><p className="text-sm font-medium">Email</p><p className="mt-2 truncate text-sm text-muted-foreground">{profile.email}</p></div>
                <div className="grid gap-2"><Label htmlFor={`role-${profile.id}`}>Role</Label><NativeSelect id={`role-${profile.id}`} name="role" defaultValue={role}><NativeSelectOption value="Operator">Operator</NativeSelectOption><NativeSelectOption value="Manager">Manager</NativeSelectOption><NativeSelectOption value="Administrator">Administrator</NativeSelectOption></NativeSelect></div>
                <div className="grid gap-2"><Label htmlFor={`site-${profile.id}`}>Assigned site</Label><NativeSelect id={`site-${profile.id}`} name="siteId" defaultValue={membership?.site_id ?? sites?.[0]?.id ?? ""}><NativeSelectOption value="">Global Administrator only</NativeSelectOption>{(sites ?? []).map((site) => <NativeSelectOption key={site.id} value={site.id}>{site.name}</NativeSelectOption>)}</NativeSelect></div>
                <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={profile.active} /> Active</label><Badge variant={profile.active ? "secondary" : "outline"}>{profile.active ? "Active" : "Pending"}</Badge><Button type="submit">Save</Button></div>
              </form>
            )
          })}
        </CardContent>
      </Card>
    </section>
  )
}
