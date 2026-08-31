create index if not exists receiving_notification_recipients_created_by_idx
  on public.receiving_notification_recipients (created_by);
create index if not exists receiving_notification_recipients_updated_by_idx
  on public.receiving_notification_recipients (updated_by);
create index if not exists receipt_notification_deliveries_recipient_id_idx
  on public.receipt_notification_deliveries (recipient_id);

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
      ) order by line.id), '[]'::jsonb) from public.receipt_lines line where line.receipt_id = receipt_row.id and line.active)
    ),
    'deliveries', claimed
  );
end;
$$;

revoke all on function public.claim_receipt_notifications_v1(uuid) from public, anon;
grant execute on function public.claim_receipt_notifications_v1(uuid) to authenticated;
