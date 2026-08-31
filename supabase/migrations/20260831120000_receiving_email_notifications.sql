create table public.receiving_notification_recipients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint receiving_notification_recipient_name_required check (btrim(display_name) <> ''),
  constraint receiving_notification_recipient_email_required check (btrim(email) <> '')
);

create unique index receiving_notification_recipients_email_lower_idx
  on public.receiving_notification_recipients (lower(email));
create index receiving_notification_recipients_active_idx
  on public.receiving_notification_recipients (active) where active;

create table public.receipt_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  recipient_id uuid references public.receiving_notification_recipients(id) on delete set null,
  recipient_name text not null,
  recipient_email text not null,
  status text not null default 'Pending',
  attempt_count integer not null default 0,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  last_attempted_at timestamptz,
  sent_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint receipt_notification_delivery_status_valid check (status in ('Pending', 'Sending', 'Sent', 'Delivered', 'Failed', 'Bounced', 'Complained', 'Suppressed')),
  constraint receipt_notification_delivery_attempts_valid check (attempt_count >= 0)
);

create unique index receipt_notification_deliveries_receipt_email_idx
  on public.receipt_notification_deliveries (receipt_id, lower(recipient_email));
create index receipt_notification_deliveries_dispatch_idx
  on public.receipt_notification_deliveries (status, created_at)
  where status in ('Pending', 'Failed');
create index receipt_notification_deliveries_provider_idx
  on public.receipt_notification_deliveries (provider_message_id)
  where provider_message_id is not null;

alter table public.receiving_notification_recipients enable row level security;
alter table public.receipt_notification_deliveries enable row level security;

create policy receiving_notification_recipients_operator_select
on public.receiving_notification_recipients for select to authenticated
using ((select private.is_administrator()));

create policy receipt_notification_deliveries_operator_select
on public.receipt_notification_deliveries for select to authenticated
using ((select private.is_administrator()));

grant select on public.receiving_notification_recipients to authenticated;
grant select on public.receipt_notification_deliveries to authenticated;

create or replace function private.queue_receipt_notifications_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'Received' and old.status is distinct from 'Received' then
    insert into public.receipt_notification_deliveries (
      receipt_id, recipient_id, recipient_name, recipient_email
    )
    select new.id, recipient.id, recipient.display_name, lower(btrim(recipient.email))
    from public.receiving_notification_recipients recipient
    where recipient.active
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.queue_receipt_notifications_v1() from public, anon, authenticated;

create trigger receipts_queue_email_notifications
after update of status on public.receipts
for each row execute function private.queue_receipt_notifications_v1();

create or replace function public.admin_upsert_receiving_notification_recipient_v1(
  p_id uuid,
  p_display_name text,
  p_email text,
  p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles%rowtype;
  recipient_id uuid := coalesce(p_id, gen_random_uuid());
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or not actor.active or actor.system_role::text <> 'Operator' then
    raise exception 'Operator permission is required.' using errcode = '42501';
  end if;
  if btrim(coalesce(p_display_name, '')) = '' then
    raise exception 'Recipient name is required.' using errcode = '23514';
  end if;
  if btrim(coalesce(p_email, '')) = '' or btrim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid recipient email.' using errcode = '23514';
  end if;

  insert into public.receiving_notification_recipients (
    id, display_name, email, active, created_by, updated_by
  ) values (
    recipient_id, btrim(p_display_name), lower(btrim(p_email)), p_active, auth.uid(), auth.uid()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    active = excluded.active,
    updated_at = now(),
    updated_by = auth.uid();

  insert into public.audit_records (
    site_id, actor_user_id, actor_name, action, entity_type, entity_id, after_state
  ) values (
    null, auth.uid(), actor.display_name, 'receiving.notification-recipient.configure',
    'ReceivingNotificationRecipient', recipient_id,
    jsonb_build_object('displayName', btrim(p_display_name), 'email', lower(btrim(p_email)), 'active', p_active)
  );

  return recipient_id;
exception
  when unique_violation then
    raise exception 'That email is already on the notification list.' using errcode = '23505';
end;
$$;

create or replace function public.admin_list_receiving_notifications_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor public.profiles%rowtype;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or not actor.active or actor.system_role::text <> 'Operator' then
    raise exception 'Operator permission is required.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'recipients', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', recipient.id,
        'displayName', recipient.display_name,
        'email', recipient.email,
        'active', recipient.active,
        'updatedAt', recipient.updated_at
      ) order by recipient.active desc, recipient.display_name), '[]'::jsonb)
      from public.receiving_notification_recipients recipient
    ),
    'deliveries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', delivery.id,
        'receiptId', delivery.receipt_id,
        'receiptNumber', receipt.receipt_number,
        'recipientName', delivery.recipient_name,
        'recipientEmail', delivery.recipient_email,
        'status', delivery.status,
        'attemptCount', delivery.attempt_count,
        'lastError', delivery.last_error,
        'createdAt', delivery.created_at,
        'sentAt', delivery.sent_at
      ) order by delivery.created_at desc), '[]'::jsonb)
      from (
        select * from public.receipt_notification_deliveries order by created_at desc limit 25
      ) delivery
      join public.receipts receipt on receipt.id = delivery.receipt_id
    )
  );
end;
$$;

create or replace function public.claim_receipt_notifications_v1(p_receipt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles%rowtype;
  receipt_row public.receipts%rowtype;
  claimed jsonb;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or not actor.active or actor.system_role::text <> 'Operator' then
    raise exception 'Operator permission is required.' using errcode = '42501';
  end if;
  select * into receipt_row from public.receipts where id = p_receipt_id and status = 'Received';
  if receipt_row.id is null then raise exception 'Completed receipt not found.' using errcode = 'P0002'; end if;

  with candidates as (
    select delivery.id
    from public.receipt_notification_deliveries delivery
    where delivery.receipt_id = p_receipt_id and delivery.status in ('Pending', 'Failed')
    for update skip locked
  ), updated as (
    update public.receipt_notification_deliveries delivery
    set status = 'Sending', attempt_count = attempt_count + 1,
        last_attempted_at = now(), last_error = null, updated_at = now()
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', updated.id,
    'recipientName', updated.recipient_name,
    'recipientEmail', updated.recipient_email
  )), '[]'::jsonb) into claimed from updated;

  return jsonb_build_object(
    'receipt', jsonb_build_object(
      'id', receipt_row.id,
      'receiptNumber', receipt_row.receipt_number,
      'projectName', (select project.name from public.projects project where project.id = receipt_row.project_id),
      'handwrittenProjectText', receipt_row.handwritten_project_text,
      'siteName', (select site.name from public.sites site where site.id = receipt_row.site_id),
      'inspectionState', receipt_row.inspection_state,
      'operatorName', receipt_row.operator_name,
      'completedAt', receipt_row.completed_at,
      'lines', (select coalesce(jsonb_agg(jsonb_build_object(
        'materialName', line.material_name,
        'packageType', line.package_type,
        'quantity', line.quantity,
        'condition', line.condition,
        'locationName', (select location.name from public.storage_locations location where location.id = line.target_location_id)
      ) order by line.created_at), '[]'::jsonb) from public.receipt_lines line where line.receipt_id = receipt_row.id and line.active)
    ),
    'deliveries', claimed
  );
end;
$$;

create or replace function public.finish_receipt_notification_v1(
  p_delivery_id uuid,
  p_status text,
  p_provider_message_id text,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles%rowtype;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or not actor.active or actor.system_role::text <> 'Operator' then
    raise exception 'Operator permission is required.' using errcode = '42501';
  end if;
  if p_status not in ('Sent', 'Failed') then raise exception 'Invalid delivery result.' using errcode = '23514'; end if;

  update public.receipt_notification_deliveries
  set status = p_status,
      provider_message_id = nullif(p_provider_message_id, ''),
      last_error = nullif(left(coalesce(p_error, ''), 500), ''),
      sent_at = case when p_status = 'Sent' then now() else sent_at end,
      updated_at = now()
  where id = p_delivery_id and status = 'Sending';
end;
$$;

revoke all on function public.admin_upsert_receiving_notification_recipient_v1(uuid, text, text, boolean) from public, anon;
revoke all on function public.admin_list_receiving_notifications_v1() from public, anon;
revoke all on function public.claim_receipt_notifications_v1(uuid) from public, anon;
revoke all on function public.finish_receipt_notification_v1(uuid, text, text, text) from public, anon;
grant execute on function public.admin_upsert_receiving_notification_recipient_v1(uuid, text, text, boolean) to authenticated;
grant execute on function public.admin_list_receiving_notifications_v1() to authenticated;
grant execute on function public.claim_receipt_notifications_v1(uuid) to authenticated;
grant execute on function public.finish_receipt_notification_v1(uuid, text, text, text) to authenticated;

insert into public.receiving_notification_recipients (display_name, email, active)
select 'Tyler Vea', 'tyler.vea@txbspecialties.com', true
where not exists (
  select 1 from public.receiving_notification_recipients
  where lower(email) = 'tyler.vea@txbspecialties.com'
);
