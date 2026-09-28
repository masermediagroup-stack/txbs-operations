-- Notification dispatch is a server worker concern. The operator-facing route and
-- server action authorize the request before these service-role-only functions run.
create or replace function public.claim_receipt_notifications_v1(p_receipt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt_row public.receipts%rowtype;
  claimed jsonb;
begin
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
      ) order by line.id), '[]'::jsonb) from public.receipt_lines line where line.receipt_id = receipt_row.id and line.active)
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
begin
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

revoke all on function public.claim_receipt_notifications_v1(uuid) from public, anon, authenticated;
revoke all on function public.finish_receipt_notification_v1(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_receipt_notifications_v1(uuid) to service_role;
grant execute on function public.finish_receipt_notification_v1(uuid, text, text, text) to service_role;
