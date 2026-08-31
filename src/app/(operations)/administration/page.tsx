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
import { notificationAdministrationSchema } from "@/features/notifications/domain/notification-administration"
import { retryReceiptNotificationAction, saveReceivingNotificationRecipientAction } from "@/features/notifications/server/administration-actions"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Administration" }
export const dynamic = "force-dynamic"

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; notificationError?: string; notificationSaved?: string; notificationRetried?: string }> }) {
  const operator = await getCurrentOperator()
  if (!operator) redirect("/login?next=/administration")
  const params = await searchParams
  const supabase = await createClient()
  const { data: profiles } = await supabase.from("profiles").select("*").order("display_name")

  if (operator.role !== "Operator") {
    return <Alert><AlertTitle>Operator access required</AlertTitle><AlertDescription>Tech accounts cannot change users or account permissions.</AlertDescription></Alert>
  }

  const { data: notificationData, error: notificationQueryError } = await supabase.rpc("admin_list_receiving_notifications_v1")
  const notificationState = notificationAdministrationSchema.safeParse(notificationData)
  const recipients = notificationState.success ? notificationState.data.recipients : []
  const deliveries = notificationState.success ? notificationState.data.deliveries : []

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">Activate Operator and Tech demo accounts and manage their access.</p>
      </div>
      {params.saved ? <Alert><AlertTitle>Account updated</AlertTitle><AlertDescription>The account type and access are active in the shared workspace.</AlertDescription></Alert> : null}
      {params.error ? <Alert variant="destructive"><AlertTitle>Account not updated</AlertTitle><AlertDescription>{params.error}</AlertDescription></Alert> : null}
      {params.notificationSaved ? <Alert><AlertTitle>Notification list updated</AlertTitle><AlertDescription>Future completed receipts will use the active recipient list.</AlertDescription></Alert> : null}
      {params.notificationRetried ? <Alert><AlertTitle>Notification retry finished</AlertTitle><AlertDescription>{params.notificationRetried} email notification(s) sent.</AlertDescription></Alert> : null}
      {params.notificationError ? <Alert variant="destructive"><AlertTitle>Notification action failed</AlertTitle><AlertDescription>{params.notificationError}</AlertDescription></Alert> : null}
      <Card>
        <CardHeader className="border-b-2 border-b-brand-orange">
          <CardTitle>Account access</CardTitle>
          <CardDescription>Create the email/password identity in the demo authentication system first. It appears here inactive, then an Operator activates it as an Operator or Tech account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {(profiles ?? []).map((profile) => {
            const role = profile.system_role === "Tech" ? "Tech" : "Operator"
            return (
              <form action={configureProfileAction} key={profile.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_11rem_auto] lg:items-end">
                <input type="hidden" name="userId" value={profile.id} />
                <div className="grid gap-2"><Label htmlFor={`name-${profile.id}`}>Display name</Label><Input id={`name-${profile.id}`} name="displayName" defaultValue={profile.display_name} required /></div>
                <div><p className="text-sm font-medium">Email</p><p className="mt-2 truncate text-sm text-muted-foreground">{profile.email}</p></div>
                <div className="grid gap-2"><Label htmlFor={`role-${profile.id}`}>Account type</Label><NativeSelect id={`role-${profile.id}`} name="role" defaultValue={role}><NativeSelectOption value="Operator">Operator</NativeSelectOption><NativeSelectOption value="Tech">Tech</NativeSelectOption></NativeSelect></div>
                <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={profile.active} /> Active</label><Badge variant={profile.active ? "secondary" : "outline"}>{profile.active ? "Active" : "Pending"}</Badge><Button type="submit">Save</Button></div>
              </form>
            )
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b-2 border-b-brand-orange">
          <CardTitle>Receiving email notifications</CardTitle>
          <CardDescription>Add or pause recipients for the email sent after a receipt is completed. Changes affect future receipts; each recipient receives a private copy.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Alert>
            <AlertTitle>Temporary test sender</AlertTitle>
            <AlertDescription>While the sender is onboarding@resend.dev, Resend can deliver only to the email address that owns the Resend account. Verify the TBS domain before adding the full team list.</AlertDescription>
          </Alert>
          {notificationQueryError || !notificationState.success ? (
            <Alert variant="destructive"><AlertTitle>Notification settings unavailable</AlertTitle><AlertDescription>{notificationQueryError?.message ?? "The notification response was not valid."}</AlertDescription></Alert>
          ) : null}
          <div className="grid gap-3">
            <h2 className="text-base font-semibold">Recipients</h2>
            {recipients.map((recipient) => (
              <form action={saveReceivingNotificationRecipientAction} key={recipient.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[minmax(10rem,0.8fr)_minmax(15rem,1.4fr)_auto] lg:items-end">
                <input type="hidden" name="id" value={recipient.id} />
                <div className="grid gap-2"><Label htmlFor={`recipient-name-${recipient.id}`}>Name</Label><Input id={`recipient-name-${recipient.id}`} name="displayName" defaultValue={recipient.displayName} required /></div>
                <div className="grid gap-2"><Label htmlFor={`recipient-email-${recipient.id}`}>Email</Label><Input id={`recipient-email-${recipient.id}`} name="email" type="email" defaultValue={recipient.email} required /></div>
                <div className="flex min-h-8 flex-wrap items-center gap-3"><label className="flex min-h-8 items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={recipient.active} /> Active</label><Badge variant={recipient.active ? "secondary" : "outline"}>{recipient.active ? "Active" : "Paused"}</Badge><Button type="submit">Save</Button></div>
              </form>
            ))}
            <form action={saveReceivingNotificationRecipientAction} className="grid gap-4 rounded-xl border border-dashed p-4 lg:grid-cols-[minmax(10rem,0.8fr)_minmax(15rem,1.4fr)_auto] lg:items-end">
              <div className="grid gap-2"><Label htmlFor="new-recipient-name">New recipient name</Label><Input id="new-recipient-name" name="displayName" required /></div>
              <div className="grid gap-2"><Label htmlFor="new-recipient-email">Email</Label><Input id="new-recipient-email" name="email" type="email" required /></div>
              <div className="flex min-h-8 items-center gap-3"><label className="flex min-h-8 items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label><Button type="submit">Add recipient</Button></div>
            </form>
          </div>
          <div className="grid gap-3">
            <div><h2 className="text-base font-semibold">Recent delivery history</h2><p className="text-sm text-muted-foreground">The latest 25 recipient deliveries. Failed messages remain available for a manual retry.</p></div>
            {deliveries.length ? <div className="grid gap-2">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="font-medium">Receipt {delivery.receiptNumber || "number not provided"}</p><p className="truncate text-sm text-muted-foreground">{delivery.recipientName} · {delivery.recipientEmail} · {new Date(delivery.createdAt).toLocaleString()}</p>{delivery.lastError ? <p className="mt-1 text-sm text-destructive">{delivery.lastError}</p> : null}</div>
                  <div className="flex items-center gap-2"><Badge variant={delivery.status === "Failed" ? "destructive" : delivery.status === "Sent" ? "secondary" : "outline"}>{delivery.status}</Badge>{delivery.status === "Failed" ? <form action={retryReceiptNotificationAction}><input type="hidden" name="receiptId" value={delivery.receiptId} /><Button type="submit" variant="outline">Retry</Button></form> : null}</div>
                </div>
              ))}
            </div> : <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No receiving emails have been queued yet. Complete a test receipt to create the first delivery.</p>}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
