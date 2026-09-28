-- Wave A: active-account reads and immutable, server-verified evidence.
create or replace function private.is_active_account()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and active and system_role in ('Operator', 'Tech'));
$$;
revoke all on function private.is_active_account() from public, anon, authenticated;
grant execute on function private.is_active_account() to authenticated;
create policy field_assignments_active_account on public.field_assignments as restrictive for select to authenticated using ((select private.is_active_account()));
create policy field_assignment_events_active_account on public.field_assignment_events as restrictive for select to authenticated using ((select private.is_active_account()));
create policy installation_confirmations_active_account on public.installation_confirmations as restrictive for select to authenticated using ((select private.is_active_account()));
create policy installation_lines_active_account on public.installation_lines as restrictive for select to authenticated using ((select private.is_active_account()));
create policy installation_photos_active_account on public.installation_photos as restrictive for select to authenticated using ((select private.is_active_account()));

-- No authenticated API caller may replace or delete operational evidence bytes.
-- Failed uploads retry at a new path; an existing matching immutable upload is reused.
create policy operational_evidence_immutable_update on storage.objects as restrictive for update to authenticated
using (bucket_id <> 'operational-media') with check (bucket_id <> 'operational-media');
create policy operational_evidence_immutable_delete on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'operational-media');
revoke update on public.staged_uploads from authenticated;

create table private.verified_uploads (
  upload_id uuid primary key references public.staged_uploads(id) on delete restrict,
  checksum_sha256 text not null,
  size_bytes bigint not null,
  verified_at timestamptz not null default now()
);
alter table private.verified_uploads enable row level security;
revoke all on private.verified_uploads from public, anon, authenticated;

create or replace function public.verify_staged_upload(p_upload_id uuid, p_actor_id uuid, p_checksum text, p_size bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.staged_uploads where id = p_upload_id and actor_user_id = p_actor_id and checksum_sha256 = p_checksum and size_bytes = p_size and consumed_at is null) then
    raise exception 'Staged evidence metadata does not match verified bytes.' using errcode = '23514';
  end if;
  insert into private.verified_uploads(upload_id, checksum_sha256, size_bytes) values (p_upload_id, p_checksum, p_size)
  on conflict (upload_id) do nothing;
end;
$$;
revoke all on function public.verify_staged_upload(uuid, uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.verify_staged_upload(uuid, uuid, text, bigint) to service_role;

create or replace function private.consume_staged_photo(
  p_upload_id uuid,
  p_command_id uuid,
  p_site_id uuid,
  p_operator_name text,
  p_file_name text,
  p_photo_type text,
  p_caption text default '',
  p_project_id uuid default null,
  p_lot_id uuid default null,
  p_receipt_id uuid default null,
  p_receipt_line_id uuid default null,
  p_movement_id uuid default null,
  p_outbound_batch_id uuid default null,
  p_issue_id uuid default null,
  p_issue_comment_id uuid default null,
  p_location_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  upload public.staged_uploads%rowtype;
  photo_id uuid := gen_random_uuid();
begin
  select * into upload
  from public.staged_uploads
  where id = p_upload_id
  for update;

  if upload.id is null
    or upload.actor_user_id <> auth.uid()
    or upload.site_id <> p_site_id
    or upload.command_id <> p_command_id
    or upload.consumed_at is not null then
    raise exception 'The staged photo is missing, already used, or does not belong to this command.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from storage.objects object
    where object.bucket_id = upload.bucket_id and object.name = upload.object_path
  ) then
    raise exception 'The staged photo upload is incomplete.' using errcode = '23514';
  end if;

  if not exists (select 1 from private.verified_uploads verified where verified.upload_id = upload.id and verified.checksum_sha256 = upload.checksum_sha256 and verified.size_bytes = upload.size_bytes) then
    raise exception 'Evidence bytes have not been verified by the server.' using errcode = '23514';
  end if;

  insert into public.photos (
    id, site_id, project_id, lot_id, receipt_id, receipt_line_id,
    movement_id, outbound_batch_id, issue_id, issue_comment_id, location_id,
    photo_type, caption, file_name, content_type, bucket_id, object_path,
    checksum_sha256, size_bytes, taken_at, uploaded_at, operator_name, actor_user_id
  ) values (
    photo_id, p_site_id, p_project_id, p_lot_id, p_receipt_id, p_receipt_line_id,
    p_movement_id, p_outbound_batch_id, p_issue_id, p_issue_comment_id, p_location_id,
    p_photo_type, coalesce(p_caption, ''), p_file_name, upload.content_type,
    upload.bucket_id, upload.object_path, upload.checksum_sha256, upload.size_bytes,
    now(), now(), p_operator_name, auth.uid()
  );

  update public.staged_uploads set consumed_at = now() where id = upload.id;
  return photo_id;
end;
$$;

revoke all on function private.consume_staged_photo(uuid, uuid, uuid, text, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;
