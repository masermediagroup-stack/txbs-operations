alter table public.receipt_lines
  add column if not exists active boolean not null default true;

create index if not exists receipt_lines_active_receipt_idx
  on public.receipt_lines (receipt_id, active);

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

create or replace function public.execute_inventory_command_v1(
  p_command_id uuid,
  p_command_type text,
  p_site_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
<<command_block>>
declare
  actor public.profiles%rowtype;
  membership_role public.app_role;
  result jsonb;
  entity_id uuid;
  now_at timestamptz := now();
  project public.projects%rowtype;
  lot public.material_lots%rowtype;
  issue public.issues%rowtype;
  receipt public.receipts%rowtype;
  receipt_line public.receipt_lines%rowtype;
  movement public.material_movements%rowtype;
  movement_line public.movement_lines%rowtype;
  outbound public.outbound_batches%rowtype;
  outbound_line public.outbound_lines%rowtype;
  item jsonb;
  line_id uuid;
  group_id uuid;
  lot_id uuid;
  child_id uuid;
  photo_id uuid;
  comment_id uuid;
  target_location_id uuid;
  requested_quantity integer;
  resulting_version integer;
  is_full boolean;
  prior_status text;
  operator_name text;
  required_manager boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));

  select command.result || jsonb_build_object('duplicate', true)
  into result
  from public.command_receipts command
  where command.command_id = p_command_id
    and command.actor_user_id = auth.uid()
    and command.site_id = p_site_id
    and command.command_type = p_command_type;
  if result is not null then return result; end if;

  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or not actor.active then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;

  operator_name := actor.display_name;
  if actor.system_role = 'Administrator' then
    membership_role := 'Administrator';
  else
    select membership.role into membership_role
    from public.site_memberships membership
    where membership.user_id = auth.uid()
      and membership.site_id = p_site_id
      and membership.active;
  end if;
  if membership_role is null then
    raise exception 'You do not have access to this site.' using errcode = '42501';
  end if;

  required_manager := p_command_type in (
    'movement.reverse', 'outbound.ready', 'outbound.depart', 'outbound.cancel',
    'outbound.reverse'
  ) or (
    p_command_type = 'issue.transition'
    and p_payload ->> 'toStatus' in ('Resolved', 'Dismissed')
  );
  if required_manager and membership_role not in ('Manager', 'Administrator') then
    raise exception 'Manager permission is required for this action.' using errcode = '42501';
  end if;

  if p_command_type = 'material.add' then
    select * into project from public.projects
    where id = (p_payload ->> 'projectId')::uuid and site_id = p_site_id;
    if project.id is null then raise exception 'Project not found.' using errcode = 'P0002'; end if;
    if btrim(coalesce(p_payload ->> 'materialName', '')) = '' then
      raise exception 'Material name is required.' using errcode = '23514';
    end if;
    if p_payload -> 'quantity' <> 'null'::jsonb and (p_payload ->> 'quantity')::integer < 0 then
      raise exception 'Quantity must be a whole number or unknown.' using errcode = '23514';
    end if;
    target_location_id := nullif(p_payload ->> 'locationId', '')::uuid;
    if target_location_id is not null and not exists (
      select 1 from public.storage_locations where id = target_location_id and site_id = p_site_id and active
    ) then raise exception 'Storage location not found.' using errcode = 'P0002'; end if;

    group_id := gen_random_uuid(); lot_id := gen_random_uuid(); entity_id := lot_id;
    insert into public.material_groups (id, project_id, name, description)
    values (group_id, project.id, btrim(p_payload ->> 'materialName'), btrim(coalesce(p_payload ->> 'description', '')));
    insert into public.material_lots (
      id, site_id, project_id, group_id, location_id, position_precision,
      position_row, position_column, position_note, package_type, quantity,
      presence, condition, protection, accessibility, handling_requirements,
      parent_lot_id, root_lot_id, created_at, updated_at, version
    ) values (
      lot_id, p_site_id, project.id, group_id, target_location_id,
      coalesce(p_payload ->> 'precision', 'Unknown'), nullif(p_payload ->> 'row', ''),
      nullif(p_payload ->> 'column', ''), btrim(coalesce(p_payload ->> 'positionNote', '')),
      p_payload ->> 'packageType', nullif(p_payload ->> 'quantity', '')::integer,
      'Present', p_payload ->> 'condition', p_payload ->> 'protection',
      p_payload ->> 'accessibility',
      coalesce(array(select jsonb_array_elements_text(p_payload -> 'handlingRequirements')), '{}'),
      null, lot_id, now_at, now_at, 1
    );
    if p_payload -> 'photoUpload' is not null and p_payload -> 'photoUpload' <> 'null'::jsonb then
      photo_id := private.consume_staged_photo(
        (p_payload #>> '{photoUpload,id}')::uuid, p_command_id, p_site_id,
        operator_name, p_payload #>> '{photoUpload,fileName}',
        coalesce(p_payload #>> '{photoUpload,photoType}', 'Material'),
        coalesce(p_payload #>> '{photoUpload,caption}', ''),
        project.id, lot_id, null, null, null, null, null, null, target_location_id
      );
    end if;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, project.id, 'Lot', lot_id, 'Material added', btrim(p_payload ->> 'materialName') || ' added to shared inventory.', now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', lot_id, 'lotId', lot_id);

  elsif p_command_type = 'verification.confirm' then
    select * into lot from public.material_lots
    where id = (p_payload ->> 'lotId')::uuid and site_id = p_site_id for update;
    if lot.id is null then raise exception 'Material lot not found.' using errcode = 'P0002'; end if;
    if p_payload ? 'expectedVersion' and lot.version <> (p_payload ->> 'expectedVersion')::integer then
      raise exception 'Material changed after it was opened.' using errcode = '40001';
    end if;
    target_location_id := nullif(p_payload ->> 'locationId', '')::uuid;
    if target_location_id is not null and not exists (
      select 1 from public.storage_locations where id = target_location_id and site_id = p_site_id and active
    ) then raise exception 'Storage location not found.' using errcode = 'P0002'; end if;
    update public.material_lots set
      location_id = target_location_id,
      position_precision = coalesce(p_payload ->> 'precision', 'Unknown'),
      position_row = nullif(p_payload ->> 'row', ''),
      position_column = nullif(p_payload ->> 'column', ''),
      position_note = btrim(coalesce(p_payload ->> 'positionNote', '')),
      updated_at = now_at, version = version + 1
    where id = lot.id;
    entity_id := gen_random_uuid();
    insert into public.verification_records (
      id, lot_id, verified_at, operator_name, actor_user_id, location_id,
      position_precision, position_row, position_column, position_note, note
    ) values (
      entity_id, lot.id, now_at, operator_name, auth.uid(), target_location_id,
      coalesce(p_payload ->> 'precision', 'Unknown'), nullif(p_payload ->> 'row', ''),
      nullif(p_payload ->> 'column', ''), btrim(coalesce(p_payload ->> 'positionNote', '')),
      btrim(coalesce(p_payload ->> 'note', ''))
    );
    if p_payload -> 'photoUpload' is not null and p_payload -> 'photoUpload' <> 'null'::jsonb then
      photo_id := private.consume_staged_photo(
        (p_payload #>> '{photoUpload,id}')::uuid, p_command_id, p_site_id,
        operator_name, p_payload #>> '{photoUpload,fileName}',
        coalesce(p_payload #>> '{photoUpload,photoType}', 'Location'),
        coalesce(p_payload #>> '{photoUpload,caption}', ''),
        lot.project_id, lot.id, null, null, null, null, null, null, target_location_id
      );
      insert into public.verification_photos (verification_id, photo_id) values (entity_id, photo_id);
    end if;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, lot.project_id, 'Lot', lot.id, 'Verified', 'Material presence and location confirmed.', now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', lot.id, 'verificationId', entity_id);

  elsif p_command_type = 'issue.record' then
    entity_id := gen_random_uuid();
    if btrim(coalesce(p_payload ->> 'title', '')) = '' then raise exception 'Issue title is required.' using errcode = '23514'; end if;
    if p_payload ->> 'type' = 'Damaged' and (p_payload -> 'photoUpload' is null or p_payload -> 'photoUpload' = 'null'::jsonb) then
      raise exception 'At least one damage photo is required for a Damaged Issue.' using errcode = '23514';
    end if;
    insert into public.issues (
      id, site_id, project_id, lot_id, receipt_id, location_id, movement_id,
      outbound_batch_id, issue_type, priority, status, title, description,
      blocking, idempotency_key, created_at, updated_at, operator_name, actor_user_id, version
    ) values (
      entity_id, p_site_id, nullif(p_payload ->> 'projectId', '')::uuid,
      nullif(p_payload ->> 'lotId', '')::uuid, nullif(p_payload ->> 'receiptId', '')::uuid,
      nullif(p_payload ->> 'locationId', '')::uuid, nullif(p_payload ->> 'movementId', '')::uuid,
      nullif(p_payload ->> 'outboundBatchId', '')::uuid, p_payload ->> 'type',
      p_payload ->> 'priority', 'Open', btrim(p_payload ->> 'title'),
      btrim(coalesce(p_payload ->> 'description', '')), coalesce((p_payload ->> 'blocking')::boolean, false),
      coalesce(nullif(p_payload ->> 'clientMutationId', '')::uuid, p_command_id),
      now_at, now_at, operator_name, auth.uid(), 1
    );
    if p_payload -> 'photoUpload' is not null and p_payload -> 'photoUpload' <> 'null'::jsonb then
      photo_id := private.consume_staged_photo(
        (p_payload #>> '{photoUpload,id}')::uuid, p_command_id, p_site_id,
        operator_name, p_payload #>> '{photoUpload,fileName}', 'Condition',
        coalesce(p_payload #>> '{photoUpload,caption}', p_payload ->> 'description'),
        nullif(p_payload ->> 'projectId', '')::uuid, nullif(p_payload ->> 'lotId', '')::uuid,
        nullif(p_payload ->> 'receiptId', '')::uuid, null, nullif(p_payload ->> 'movementId', '')::uuid,
        nullif(p_payload ->> 'outboundBatchId', '')::uuid, entity_id, null,
        nullif(p_payload ->> 'locationId', '')::uuid
      );
    end if;
    insert into public.issue_transitions (issue_id, transition_kind, from_status, to_status, note, occurred_at, operator_name, actor_user_id)
    values (entity_id, 'Created', null, 'Open', coalesce(nullif(btrim(p_payload ->> 'description'), ''), btrim(p_payload ->> 'title')), now_at, operator_name, auth.uid());
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, nullif(p_payload ->> 'projectId', '')::uuid, 'Issue', entity_id, 'Issue recorded', btrim(p_payload ->> 'title'), now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', entity_id, 'issueId', entity_id);

  elsif p_command_type = 'issue.assign' then
    select * into issue from public.issues where id = (p_payload ->> 'issueId')::uuid and site_id = p_site_id for update;
    if issue.id is null then raise exception 'Issue not found.' using errcode = 'P0002'; end if;
    update public.issues set assignee_name = nullif(btrim(p_payload ->> 'assigneeName'), ''), updated_at = now_at, version = version + 1 where id = issue.id;
    insert into public.issue_transitions (issue_id, transition_kind, from_status, to_status, note, occurred_at, operator_name, actor_user_id)
    values (issue.id, 'Assigned', issue.status, issue.status, case when nullif(btrim(p_payload ->> 'assigneeName'), '') is null then 'Issue unassigned.' else 'Assigned to ' || btrim(p_payload ->> 'assigneeName') || '.' end, now_at, operator_name, auth.uid());
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, issue.project_id, 'Issue', issue.id, 'Issue assigned', 'Issue assignment updated.', now_at, operator_name, auth.uid());
    entity_id := issue.id; result := jsonb_build_object('entityId', issue.id);

  elsif p_command_type = 'issue.comment' then
    select * into issue from public.issues where id = (p_payload ->> 'issueId')::uuid and site_id = p_site_id for update;
    if issue.id is null then raise exception 'Issue not found.' using errcode = 'P0002'; end if;
    if btrim(coalesce(p_payload ->> 'body', '')) = '' and (p_payload -> 'photoUpload' is null or p_payload -> 'photoUpload' = 'null'::jsonb) then
      raise exception 'Add a comment or photo before saving follow-up.' using errcode = '23514';
    end if;
    comment_id := gen_random_uuid(); entity_id := comment_id;
    insert into public.issue_comments (id, issue_id, body, created_at, operator_name, actor_user_id)
    values (comment_id, issue.id, btrim(coalesce(p_payload ->> 'body', '')), now_at, operator_name, auth.uid());
    if p_payload -> 'photoUpload' is not null and p_payload -> 'photoUpload' <> 'null'::jsonb then
      photo_id := private.consume_staged_photo(
        (p_payload #>> '{photoUpload,id}')::uuid, p_command_id, p_site_id,
        operator_name, p_payload #>> '{photoUpload,fileName}', 'Condition',
        coalesce(p_payload #>> '{photoUpload,caption}', p_payload ->> 'body'),
        issue.project_id, issue.lot_id, issue.receipt_id, null, issue.movement_id,
        issue.outbound_batch_id, issue.id, comment_id, issue.location_id
      );
    end if;
    update public.issues set updated_at = now_at, version = version + 1 where id = issue.id;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, issue.project_id, 'Issue', issue.id, 'Issue commented', coalesce(nullif(btrim(p_payload ->> 'body'), ''), 'Photo evidence added.'), now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', comment_id, 'issueId', issue.id);

  elsif p_command_type = 'issue.transition' then
    select * into issue from public.issues where id = (p_payload ->> 'issueId')::uuid and site_id = p_site_id for update;
    if issue.id is null then raise exception 'Issue not found.' using errcode = 'P0002'; end if;
    prior_status := issue.status;
    if btrim(coalesce(p_payload ->> 'note', '')) = '' then raise exception 'A note is required for every Issue status change.' using errcode = '23514'; end if;
    if not ((issue.status = 'Open' and p_payload ->> 'toStatus' in ('In Progress','Resolved','Dismissed'))
      or (issue.status = 'In Progress' and p_payload ->> 'toStatus' in ('Open','Resolved','Dismissed'))
      or (issue.status in ('Resolved','Dismissed') and p_payload ->> 'toStatus' = 'Open')) then
      raise exception 'This Issue status change is not allowed.' using errcode = '23514';
    end if;
    if issue.issue_type = 'Damaged' and p_payload ->> 'toStatus' in ('Resolved','Dismissed')
      and not exists (select 1 from public.photos where issue_id = issue.id and content_type like 'image/%') then
      raise exception 'Add a damage photo before completing a Damaged Issue.' using errcode = '23514';
    end if;
    if issue.issue_type = 'Unknown shipment' and p_payload ->> 'toStatus' = 'Resolved' and issue.receipt_id is not null then
      select * into project from public.projects where id = nullif(p_payload ->> 'resolvedProjectId', '')::uuid and site_id = p_site_id;
      if project.id is null then raise exception 'Select the confirmed project before resolving an Unknown Shipment.' using errcode = '23514'; end if;
      update public.receipts set project_id = project.id, identity_state = 'Matched', updated_at = now_at, version = version + 1 where id = issue.receipt_id;
      update public.issues set project_id = project.id where id = issue.id;
      insert into public.issue_transitions (issue_id, transition_kind, from_status, to_status, note, occurred_at, operator_name, actor_user_id)
      values (issue.id, 'Linked', issue.status, issue.status, 'Linked receipt to ' || project.name || '. Original receiving evidence preserved.', now_at, operator_name, auth.uid());
    end if;
    update public.issues set status = p_payload ->> 'toStatus', resolution_note = case when p_payload ->> 'toStatus' in ('Resolved','Dismissed') then btrim(p_payload ->> 'note') else null end, updated_at = now_at, version = version + 1 where id = issue.id;
    insert into public.issue_transitions (issue_id, transition_kind, from_status, to_status, note, occurred_at, operator_name, actor_user_id)
    values (issue.id, 'Status changed', prior_status, p_payload ->> 'toStatus', btrim(p_payload ->> 'note'), now_at, operator_name, auth.uid());
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, coalesce(project.id, issue.project_id), 'Issue', issue.id, 'Issue status changed', issue.title || ': ' || prior_status || ' to ' || (p_payload ->> 'toStatus') || '.', now_at, operator_name, auth.uid());
    entity_id := issue.id; result := jsonb_build_object('entityId', issue.id);

  elsif p_command_type = 'receipt.save-draft' then
    if jsonb_array_length(coalesce(p_payload -> 'lines', '[]'::jsonb)) = 0 then raise exception 'Add at least one receipt line.' using errcode = '23514'; end if;
    entity_id := coalesce(nullif(p_payload ->> 'receiptId', '')::uuid, gen_random_uuid());
    select * into receipt from public.receipts where id = entity_id for update;
    if receipt.id is not null and (receipt.site_id <> p_site_id or receipt.status = 'Received') then raise exception 'A completed receipt cannot be edited.' using errcode = '23514'; end if;
    insert into public.receipts (
      id, site_id, project_id, staging_location_id, receipt_number, identity_state,
      inspection_state, status, handwritten_project_text, physical_label_applied,
      notes, created_at, updated_at, completed_at, operator_name, actor_user_id, version
    ) values (
      entity_id, p_site_id, nullif(p_payload ->> 'projectId', '')::uuid,
      nullif(p_payload ->> 'stagingLocationId', '')::uuid, btrim(coalesce(p_payload ->> 'receiptNumber', '')),
      case when nullif(p_payload ->> 'projectId', '') is null then 'Unresolved' else 'Matched' end,
      p_payload ->> 'inspectionState', 'Draft', btrim(coalesce(p_payload ->> 'handwrittenProjectText', '')),
      coalesce((p_payload ->> 'physicalLabelApplied')::boolean, false), btrim(coalesce(p_payload ->> 'notes', '')),
      now_at, now_at, null, operator_name, auth.uid(), 1
    ) on conflict (id) do update set
      project_id = excluded.project_id, staging_location_id = excluded.staging_location_id,
      receipt_number = excluded.receipt_number, identity_state = excluded.identity_state,
      inspection_state = excluded.inspection_state, handwritten_project_text = excluded.handwritten_project_text,
      physical_label_applied = excluded.physical_label_applied, notes = excluded.notes,
      updated_at = excluded.updated_at, operator_name = excluded.operator_name,
      actor_user_id = excluded.actor_user_id, version = public.receipts.version + 1;

    update public.receipt_lines set active = false where receipt_id = entity_id;
    for item in select * from jsonb_array_elements(p_payload -> 'lines') loop
      line_id := coalesce(nullif(item ->> 'id', '')::uuid, gen_random_uuid());
      if btrim(coalesce(item ->> 'materialName', '')) = '' then raise exception 'Material name is required for every receipt line.' using errcode = '23514'; end if;
      insert into public.receipt_lines (
        id, receipt_id, material_name, description, package_type, quantity, condition,
        protection, accessibility, handling_requirements, target_location_id, active
      ) values (
        line_id, entity_id, btrim(item ->> 'materialName'), btrim(coalesce(item ->> 'description', '')),
        item ->> 'packageType', nullif(item ->> 'quantity', '')::integer, item ->> 'condition',
        item ->> 'protection', item ->> 'accessibility',
        coalesce(array(select jsonb_array_elements_text(item -> 'handlingRequirements')), '{}'),
        nullif(item ->> 'targetLocationId', '')::uuid, true
      ) on conflict (id) do update set
        material_name = excluded.material_name, description = excluded.description,
        package_type = excluded.package_type, quantity = excluded.quantity,
        condition = excluded.condition, protection = excluded.protection,
        accessibility = excluded.accessibility, handling_requirements = excluded.handling_requirements,
        target_location_id = excluded.target_location_id, active = true;
      if item -> 'photoUpload' is not null and item -> 'photoUpload' <> 'null'::jsonb then
        photo_id := private.consume_staged_photo(
          (item #>> '{photoUpload,id}')::uuid, p_command_id, p_site_id,
          operator_name, item #>> '{photoUpload,fileName}', 'Material',
          coalesce(item #>> '{photoUpload,caption}', item ->> 'materialName'),
          nullif(p_payload ->> 'projectId', '')::uuid, null, entity_id, line_id,
          null, null, null, null,
          coalesce(nullif(item ->> 'targetLocationId', '')::uuid, nullif(p_payload ->> 'stagingLocationId', '')::uuid)
        );
      end if;
    end loop;
    if p_payload -> 'documentUpload' is not null and p_payload -> 'documentUpload' <> 'null'::jsonb then
      perform private.consume_staged_photo((p_payload #>> '{documentUpload,id}')::uuid, p_command_id, p_site_id, operator_name, p_payload #>> '{documentUpload,fileName}', 'Document', 'Receiving document', nullif(p_payload ->> 'projectId', '')::uuid, null, entity_id, null, null, null, null, null, nullif(p_payload ->> 'stagingLocationId', '')::uuid);
    end if;
    if p_payload -> 'labelUpload' is not null and p_payload -> 'labelUpload' <> 'null'::jsonb then
      perform private.consume_staged_photo((p_payload #>> '{labelUpload,id}')::uuid, p_command_id, p_site_id, operator_name, p_payload #>> '{labelUpload,fileName}', 'Label', coalesce(p_payload ->> 'handwrittenProjectText', ''), nullif(p_payload ->> 'projectId', '')::uuid, null, entity_id, null, null, null, null, null, nullif(p_payload ->> 'stagingLocationId', '')::uuid);
    end if;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, nullif(p_payload ->> 'projectId', '')::uuid, 'Receipt', entity_id, 'Receipt draft saved', 'Receiving draft saved to shared inventory.', now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', entity_id, 'receiptId', entity_id, 'lineIds', (select coalesce(jsonb_agg(id), '[]'::jsonb) from public.receipt_lines where receipt_id = entity_id and active));

  elsif p_command_type = 'receipt.complete' then
    select * into receipt from public.receipts where id = (p_payload ->> 'receiptId')::uuid and site_id = p_site_id for update;
    if receipt.id is null then raise exception 'Receipt draft not found.' using errcode = 'P0002'; end if;
    if receipt.status = 'Received' then raise exception 'This receipt is already complete.' using errcode = '23514'; end if;
    if not exists (select 1 from public.receipt_lines where receipt_id = receipt.id and active) then raise exception 'Add at least one receipt line before receiving.' using errcode = '23514'; end if;
    if exists (
      select 1 from public.receipt_lines line where line.receipt_id = receipt.id and line.active
      and not exists (select 1 from public.photos photo where photo.receipt_line_id = line.id and photo.photo_type = 'Material' and photo.content_type like 'image/%')
    ) then raise exception 'A material photo is required for every receipt line before receiving.' using errcode = '23514'; end if;
    if receipt.project_id is not null then
      select * into project from public.projects where id = receipt.project_id and site_id = p_site_id;
      if project.id is null then raise exception 'Matched project not found.' using errcode = 'P0002'; end if;
      for receipt_line in select * from public.receipt_lines where receipt_id = receipt.id and active loop
        group_id := gen_random_uuid(); lot_id := gen_random_uuid();
        target_location_id := coalesce(receipt_line.target_location_id, receipt.staging_location_id);
        insert into public.material_groups (id, project_id, name, description) values (group_id, project.id, receipt_line.material_name, receipt_line.description);
        insert into public.material_lots (
          id, site_id, project_id, group_id, location_id, position_precision, position_note,
          package_type, quantity, presence, condition, protection, accessibility,
          handling_requirements, parent_lot_id, root_lot_id, created_at, updated_at, version
        ) values (
          lot_id, p_site_id, project.id, group_id, target_location_id,
          case when target_location_id is null then 'Unknown' else 'General' end,
          case when target_location_id is null then '' else 'Assigned during receiving' end,
          receipt_line.package_type, receipt_line.quantity, 'Present', receipt_line.condition,
          receipt_line.protection, receipt_line.accessibility, receipt_line.handling_requirements,
          null, lot_id, now_at, now_at, 1
        );
        line_id := gen_random_uuid();
        insert into public.verification_records (id, lot_id, verified_at, operator_name, actor_user_id, location_id, position_precision, position_note, note)
        values (line_id, lot_id, now_at, operator_name, auth.uid(), target_location_id, case when target_location_id is null then 'Unknown' else 'General' end, case when target_location_id is null then '' else 'Assigned during receiving' end, 'Created from receipt ' || coalesce(nullif(receipt.receipt_number, ''), receipt.id::text) || '.');
        update public.photos set lot_id = command_block.lot_id, project_id = project.id where receipt_line_id = receipt_line.id;
        insert into public.verification_photos (verification_id, photo_id) select line_id, id from public.photos where receipt_line_id = receipt_line.id;
        if receipt_line.condition = 'Damaged' then
          issue.id := gen_random_uuid();
          insert into public.issues (id, site_id, project_id, lot_id, receipt_id, location_id, issue_type, priority, status, title, description, blocking, idempotency_key, created_at, updated_at, operator_name, actor_user_id, version)
          values (issue.id, p_site_id, project.id, lot_id, receipt.id, target_location_id, 'Damaged', 'High', 'Open', 'Damage recorded during receiving: ' || receipt_line.material_name, receipt_line.description, true, gen_random_uuid(), now_at, now_at, operator_name, auth.uid(), 1);
          update public.photos set issue_id = issue.id where receipt_line_id = receipt_line.id;
          insert into public.issue_transitions (issue_id, transition_kind, from_status, to_status, note, occurred_at, operator_name, actor_user_id)
          values (issue.id, 'Created', null, 'Open', coalesce(nullif(receipt_line.description, ''), 'Damage recorded during receiving.'), now_at, operator_name, auth.uid());
        end if;
      end loop;
    else
      issue.id := gen_random_uuid();
      insert into public.issues (id, site_id, receipt_id, location_id, issue_type, priority, status, title, description, blocking, idempotency_key, created_at, updated_at, operator_name, actor_user_id, version)
      values (issue.id, p_site_id, receipt.id, receipt.staging_location_id, 'Unknown shipment', 'High', 'Open', 'Unknown shipment ' || coalesce(nullif(receipt.receipt_number, ''), receipt.id::text), case when receipt.handwritten_project_text <> '' then 'Field label: ' || receipt.handwritten_project_text else 'No project could be confirmed during receiving.' end, true, gen_random_uuid(), now_at, now_at, operator_name, auth.uid(), 1);
      insert into public.issue_transitions (issue_id, transition_kind, from_status, to_status, note, occurred_at, operator_name, actor_user_id)
      values (issue.id, 'Created', null, 'Open', 'Unknown shipment preserved for resolution.', now_at, operator_name, auth.uid());
    end if;
    update public.receipts set status = 'Received', completed_at = now_at, updated_at = now_at, operator_name = command_block.operator_name, actor_user_id = auth.uid(), version = version + 1 where id = receipt.id;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, receipt.project_id, 'Receipt', receipt.id, 'Received', case when receipt.project_id is null then 'Unknown shipment received and preserved for resolution.' else 'Receipt completed and material lots created.' end, now_at, operator_name, auth.uid());
    entity_id := receipt.id; result := jsonb_build_object('entityId', receipt.id, 'receiptId', receipt.id);

  elsif p_command_type = 'movement.create' then
    if btrim(coalesce(p_payload ->> 'reason', '')) = '' then raise exception 'Movement reason is required.' using errcode = '23514'; end if;
    if jsonb_array_length(coalesce(p_payload -> 'lines', '[]'::jsonb)) = 0 then raise exception 'Select at least one material lot.' using errcode = '23514'; end if;
    target_location_id := nullif(p_payload ->> 'locationId', '')::uuid;
    if not exists (select 1 from public.storage_locations where id = target_location_id and site_id = p_site_id and active) then raise exception 'Destination location not found.' using errcode = 'P0002'; end if;
    entity_id := gen_random_uuid();
    insert into public.material_movements (id, site_id, movement_kind, reason, note, operator_name, actor_user_id, occurred_at, client_mutation_id)
    values (entity_id, p_site_id, 'Move', btrim(p_payload ->> 'reason'), btrim(coalesce(p_payload ->> 'note', '')), operator_name, auth.uid(), now_at, p_command_id);
    for item in select * from jsonb_array_elements(p_payload -> 'lines') loop
      select * into lot from public.material_lots where id = (item ->> 'lotId')::uuid and site_id = p_site_id for update;
      if lot.id is null then raise exception 'Material lot not found.' using errcode = 'P0002'; end if;
      if lot.presence <> 'Present' then raise exception 'Removed or departed material cannot be moved.' using errcode = '23514'; end if;
      if lot.version <> (item ->> 'expectedVersion')::integer then raise exception 'Material changed after selection.' using errcode = '40001'; end if;
      if exists (
        select 1 from public.outbound_lines line join public.outbound_batches batch on batch.id = line.batch_id
        where line.source_lot_id = lot.id and batch.state in ('Planned','Ready')
      ) then raise exception 'Material reserved for outbound cannot be moved.' using errcode = '23514'; end if;
      requested_quantity := nullif(item ->> 'quantity', '')::integer;
      if lot.quantity is null and requested_quantity is not null then raise exception 'A lot with unknown quantity can only be moved in full.' using errcode = '23514'; end if;
      if lot.quantity is not null and (requested_quantity is null or requested_quantity <= 0 or requested_quantity > lot.quantity) then raise exception 'Move quantity is not available.' using errcode = '23514'; end if;
      if lot.location_id is not distinct from target_location_id
        and lot.position_precision = coalesce(p_payload ->> 'precision', 'Unknown')
        and lot.position_row is not distinct from nullif(p_payload ->> 'row', '')
        and lot.position_column is not distinct from nullif(p_payload ->> 'column', '')
        and lot.position_note = btrim(coalesce(p_payload ->> 'positionNote', '')) then
        raise exception 'Source and destination cannot be the same.' using errcode = '23514';
      end if;
      is_full := lot.quantity is null or requested_quantity = lot.quantity;
      if is_full then
        update public.material_lots set location_id = target_location_id,
          position_precision = coalesce(p_payload ->> 'precision', 'Unknown'),
          position_row = nullif(p_payload ->> 'row', ''), position_column = nullif(p_payload ->> 'column', ''),
          position_note = btrim(coalesce(p_payload ->> 'positionNote', '')), updated_at = now_at, version = version + 1
        where id = lot.id;
        child_id := lot.id;
        resulting_version := lot.version + 1;
      else
        update public.material_lots set quantity = quantity - requested_quantity, updated_at = now_at, version = version + 1 where id = lot.id;
        child_id := gen_random_uuid(); resulting_version := 1;
        insert into public.material_lots (
          id, site_id, project_id, group_id, location_id, position_precision, position_row,
          position_column, position_note, package_type, quantity, presence, condition,
          protection, accessibility, handling_requirements, parent_lot_id, root_lot_id,
          created_at, updated_at, version
        ) values (
          child_id, lot.site_id, lot.project_id, lot.group_id, target_location_id,
          coalesce(p_payload ->> 'precision', 'Unknown'), nullif(p_payload ->> 'row', ''),
          nullif(p_payload ->> 'column', ''), btrim(coalesce(p_payload ->> 'positionNote', '')),
          lot.package_type, requested_quantity, lot.presence, lot.condition, lot.protection,
          lot.accessibility, lot.handling_requirements, lot.id, lot.root_lot_id, now_at, now_at, 1
        );
      end if;
      insert into public.movement_lines (
        movement_id, source_lot_id, resulting_lot_id, source_location_id,
        source_position_precision, source_position_row, source_position_column, source_position_note,
        destination_location_id, destination_position_precision, destination_position_row,
        destination_position_column, destination_position_note, quantity, resulting_lot_version
      ) values (
        entity_id, lot.id, child_id, lot.location_id, lot.position_precision, lot.position_row,
        lot.position_column, lot.position_note, target_location_id,
        coalesce(p_payload ->> 'precision', 'Unknown'), nullif(p_payload ->> 'row', ''),
        nullif(p_payload ->> 'column', ''), btrim(coalesce(p_payload ->> 'positionNote', '')),
        requested_quantity, resulting_version
      );
    end loop;
    if p_payload -> 'photoUpload' is not null and p_payload -> 'photoUpload' <> 'null'::jsonb then
      photo_id := private.consume_staged_photo(
        (p_payload #>> '{photoUpload,id}')::uuid, p_command_id, p_site_id, operator_name,
        p_payload #>> '{photoUpload,fileName}', 'Location', coalesce(p_payload ->> 'note', ''),
        null, null, null, null, entity_id, null, null, null, target_location_id
      );
    end if;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, null, 'Movement', entity_id, 'Material moved', jsonb_array_length(p_payload -> 'lines')::text || ' material lot(s) moved.', now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', entity_id, 'movementId', entity_id);

  elsif p_command_type = 'movement.reverse' then
    select * into movement from public.material_movements where id = (p_payload ->> 'movementId')::uuid and site_id = p_site_id and movement_kind = 'Move';
    if movement.id is null then raise exception 'Original movement not found.' using errcode = 'P0002'; end if;
    if exists (select 1 from public.material_movements where reversal_of_movement_id = movement.id) then raise exception 'This movement has already been reversed.' using errcode = '23514'; end if;
    entity_id := gen_random_uuid();
    insert into public.material_movements (id, site_id, movement_kind, reason, note, operator_name, actor_user_id, occurred_at, client_mutation_id, reversal_of_movement_id)
    values (entity_id, p_site_id, 'Reversal', 'Reversal: ' || movement.reason, btrim(coalesce(p_payload ->> 'note', '')), operator_name, auth.uid(), now_at, p_command_id, movement.id);
    for movement_line in select * from public.movement_lines where movement_id = movement.id loop
      select * into lot from public.material_lots where id = movement_line.resulting_lot_id for update;
      if lot.id is null or lot.presence <> 'Present' or lot.version <> movement_line.resulting_lot_version
        or lot.location_id is distinct from movement_line.destination_location_id
        or lot.position_precision <> movement_line.destination_position_precision
        or lot.position_row is distinct from movement_line.destination_position_row
        or lot.position_column is distinct from movement_line.destination_position_column
        or lot.position_note <> movement_line.destination_position_note then
        raise exception 'Moved material changed and cannot be reversed automatically.' using errcode = '40001';
      end if;
      update public.material_lots set location_id = movement_line.source_location_id,
        position_precision = movement_line.source_position_precision,
        position_row = movement_line.source_position_row, position_column = movement_line.source_position_column,
        position_note = movement_line.source_position_note, updated_at = now_at, version = version + 1
      where id = lot.id;
      insert into public.movement_lines (
        movement_id, source_lot_id, resulting_lot_id, source_location_id,
        source_position_precision, source_position_row, source_position_column, source_position_note,
        destination_location_id, destination_position_precision, destination_position_row,
        destination_position_column, destination_position_note, quantity, resulting_lot_version
      ) values (
        entity_id, lot.id, lot.id, lot.location_id, lot.position_precision, lot.position_row,
        lot.position_column, lot.position_note, movement_line.source_location_id,
        movement_line.source_position_precision, movement_line.source_position_row,
        movement_line.source_position_column, movement_line.source_position_note,
        movement_line.quantity, lot.version + 1
      );
    end loop;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, null, 'Movement', entity_id, 'Movement reversed', 'Material returned to the recorded source through a reversal.', now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', entity_id, 'movementId', entity_id);

  elsif p_command_type = 'outbound.plan' then
    select * into project from public.projects where id = (p_payload ->> 'projectId')::uuid and site_id = p_site_id;
    if project.id is null then raise exception 'Project not found.' using errcode = 'P0002'; end if;
    if jsonb_array_length(coalesce(p_payload -> 'lines', '[]'::jsonb)) = 0 then raise exception 'Select at least one material lot.' using errcode = '23514'; end if;
    entity_id := gen_random_uuid();
    insert into public.outbound_batches (id, site_id, project_id, state, operator_name, actor_user_id, planned_at, client_mutation_id, version)
    values (entity_id, p_site_id, project.id, 'Planned', operator_name, auth.uid(), now_at, p_command_id, 1);
    for item in select * from jsonb_array_elements(p_payload -> 'lines') loop
      select * into lot from public.material_lots where id = (item ->> 'lotId')::uuid and site_id = p_site_id and project_id = project.id for update;
      if lot.id is null then raise exception 'Selected material does not belong to this project and site.' using errcode = 'P0002'; end if;
      if lot.presence <> 'Present' then raise exception 'Removed material cannot be prepared for outbound.' using errcode = '23514'; end if;
      if lot.version <> (item ->> 'expectedVersion')::integer then raise exception 'Material changed after selection.' using errcode = '40001'; end if;
      if exists (select 1 from public.outbound_lines line join public.outbound_batches batch on batch.id = line.batch_id where line.source_lot_id = lot.id and batch.state in ('Planned','Ready')) then raise exception 'This material is already reserved.' using errcode = '23514'; end if;
      requested_quantity := nullif(item ->> 'quantity', '')::integer;
      if lot.quantity is null and requested_quantity is not null then raise exception 'A lot with unknown quantity can only be reserved in full.' using errcode = '23514'; end if;
      if lot.quantity is not null and (requested_quantity is null or requested_quantity <= 0 or requested_quantity > lot.quantity) then raise exception 'Outbound quantity is not available.' using errcode = '23514'; end if;
      select * into receipt_line from public.receipt_lines where false;
      insert into public.outbound_lines (
        batch_id, source_lot_id, quantity, source_lot_version, source_location_id,
        source_position_precision, source_position_row, source_position_column,
        source_position_note, material_name, package_type, handling_requirements
      ) values (
        entity_id, lot.id, requested_quantity, lot.version, lot.location_id,
        lot.position_precision, lot.position_row, lot.position_column, lot.position_note,
        coalesce((select name from public.material_groups where id = lot.group_id), 'Material lot'),
        lot.package_type, lot.handling_requirements
      );
    end loop;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, project.id, 'Outbound', entity_id, 'Outbound planned', 'Material reserved for outbound.', now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', entity_id, 'batchId', entity_id);

  elsif p_command_type = 'outbound.ready' then
    select * into outbound from public.outbound_batches where id = (p_payload ->> 'batchId')::uuid and site_id = p_site_id for update;
    if outbound.id is null then raise exception 'Outbound batch not found.' using errcode = 'P0002'; end if;
    if outbound.state <> 'Planned' then raise exception 'Only a planned batch can be marked ready.' using errcode = '23514'; end if;
    if exists (select 1 from public.issues where project_id = outbound.project_id and blocking and status in ('Open','In Progress')) then raise exception 'Resolve blocking Issues before marking material ready.' using errcode = '23514'; end if;
    for outbound_line in select * from public.outbound_lines where batch_id = outbound.id loop
      select * into lot from public.material_lots where id = outbound_line.source_lot_id for update;
      if lot.id is null or lot.presence <> 'Present' then raise exception 'Selected material is no longer present.' using errcode = '40001'; end if;
      if not exists (select 1 from public.verification_records where lot_id = lot.id and verified_at >= now_at - interval '14 days') then raise exception 'Confirm every selected lot before marking this batch ready.' using errcode = '23514'; end if;
      update public.outbound_lines set source_lot_version = lot.version, source_location_id = lot.location_id,
        source_position_precision = lot.position_precision, source_position_row = lot.position_row,
        source_position_column = lot.position_column, source_position_note = lot.position_note
      where id = outbound_line.id;
    end loop;
    update public.outbound_batches set state = 'Ready', ready_at = now_at, version = version + 1 where id = outbound.id;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, outbound.project_id, 'Outbound', outbound.id, 'Outbound ready', 'Outbound material confirmed ready for pickup.', now_at, operator_name, auth.uid());
    entity_id := outbound.id; result := jsonb_build_object('entityId', outbound.id, 'batchId', outbound.id);

  elsif p_command_type = 'outbound.depart' then
    select * into outbound from public.outbound_batches where id = (p_payload ->> 'batchId')::uuid and site_id = p_site_id for update;
    if outbound.id is null then raise exception 'Outbound batch not found.' using errcode = 'P0002'; end if;
    if outbound.state <> 'Ready' then raise exception 'Only a ready outbound batch can depart.' using errcode = '23514'; end if;
    for outbound_line in select * from public.outbound_lines where batch_id = outbound.id loop
      select * into lot from public.material_lots where id = outbound_line.source_lot_id for update;
      if lot.id is null or lot.presence <> 'Present' or lot.version <> outbound_line.source_lot_version then raise exception 'Material changed after readiness confirmation.' using errcode = '40001'; end if;
      is_full := lot.quantity is null or outbound_line.quantity = lot.quantity;
      if is_full then
        update public.material_lots set presence = 'Removed', updated_at = now_at, version = version + 1 where id = lot.id;
        child_id := lot.id; resulting_version := lot.version + 1;
      else
        if outbound_line.quantity is null or lot.quantity is null or outbound_line.quantity <= 0 or outbound_line.quantity > lot.quantity then raise exception 'Outbound quantity is no longer available.' using errcode = '40001'; end if;
        update public.material_lots set quantity = quantity - outbound_line.quantity, updated_at = now_at, version = version + 1 where id = lot.id;
        child_id := gen_random_uuid(); resulting_version := 1;
        insert into public.material_lots (
          id, site_id, project_id, group_id, location_id, position_precision, position_row,
          position_column, position_note, package_type, quantity, presence, condition,
          protection, accessibility, handling_requirements, parent_lot_id, root_lot_id,
          created_at, updated_at, version
        ) values (
          child_id, lot.site_id, lot.project_id, lot.group_id, lot.location_id,
          lot.position_precision, lot.position_row, lot.position_column, lot.position_note,
          lot.package_type, outbound_line.quantity, 'Removed', lot.condition, lot.protection,
          lot.accessibility, lot.handling_requirements, lot.id, lot.root_lot_id, now_at, now_at, 1
        );
      end if;
      update public.outbound_lines set resulting_lot_id = child_id, resulting_lot_version = resulting_version where id = outbound_line.id;
    end loop;
    update public.outbound_batches set state = 'Departed', departed_at = now_at,
      carrier_reference = btrim(coalesce(p_payload ->> 'carrierReference', '')),
      driver_reference = btrim(coalesce(p_payload ->> 'driverReference', '')),
      note = btrim(coalesce(p_payload ->> 'note', '')), version = version + 1
    where id = outbound.id;
    if p_payload -> 'photoUpload' is not null and p_payload -> 'photoUpload' <> 'null'::jsonb then
      photo_id := private.consume_staged_photo((p_payload #>> '{photoUpload,id}')::uuid, p_command_id, p_site_id, operator_name, p_payload #>> '{photoUpload,fileName}', 'Material', coalesce(p_payload ->> 'note', ''), outbound.project_id, null, null, null, null, outbound.id, null, null, null);
    end if;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, outbound.project_id, 'Outbound', outbound.id, 'Outbound departed', 'Outbound material recorded as departed.', now_at, operator_name, auth.uid());
    entity_id := outbound.id; result := jsonb_build_object('entityId', outbound.id, 'batchId', outbound.id);

  elsif p_command_type = 'outbound.cancel' then
    select * into outbound from public.outbound_batches where id = (p_payload ->> 'batchId')::uuid and site_id = p_site_id for update;
    if outbound.id is null then raise exception 'Outbound batch not found.' using errcode = 'P0002'; end if;
    if outbound.state not in ('Planned','Ready') then raise exception 'Only a planned or ready batch can be cancelled.' using errcode = '23514'; end if;
    update public.outbound_batches set state = 'Cancelled', cancelled_at = now_at, note = btrim(coalesce(p_payload ->> 'note', '')), version = version + 1 where id = outbound.id;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, outbound.project_id, 'Outbound', outbound.id, 'Outbound cancelled', 'Outbound reservation cancelled and material released.', now_at, operator_name, auth.uid());
    entity_id := outbound.id; result := jsonb_build_object('entityId', outbound.id, 'batchId', outbound.id);

  elsif p_command_type = 'outbound.reverse' then
    select * into outbound from public.outbound_batches where id = (p_payload ->> 'batchId')::uuid and site_id = p_site_id and state = 'Departed';
    if outbound.id is null then raise exception 'Departed outbound batch not found.' using errcode = 'P0002'; end if;
    if exists (select 1 from public.outbound_batches where reversal_of_batch_id = outbound.id) then raise exception 'This departure has already been reversed.' using errcode = '23514'; end if;
    entity_id := gen_random_uuid();
    insert into public.outbound_batches (id, site_id, project_id, state, operator_name, actor_user_id, carrier_reference, driver_reference, note, planned_at, reversed_at, client_mutation_id, reversal_of_batch_id, version)
    values (entity_id, p_site_id, outbound.project_id, 'Reversed', operator_name, auth.uid(), outbound.carrier_reference, outbound.driver_reference, btrim(coalesce(p_payload ->> 'note', '')), now_at, now_at, p_command_id, outbound.id, 1);
    for outbound_line in select * from public.outbound_lines where batch_id = outbound.id loop
      select * into lot from public.material_lots where id = outbound_line.resulting_lot_id for update;
      if lot.id is null or lot.presence <> 'Removed' or lot.version <> outbound_line.resulting_lot_version then raise exception 'Departed material changed and cannot be reversed automatically.' using errcode = '40001'; end if;
      update public.material_lots set presence = 'Present', location_id = outbound_line.source_location_id,
        position_precision = outbound_line.source_position_precision,
        position_row = outbound_line.source_position_row, position_column = outbound_line.source_position_column,
        position_note = outbound_line.source_position_note, updated_at = now_at, version = version + 1
      where id = lot.id;
      insert into public.outbound_lines (
        batch_id, source_lot_id, resulting_lot_id, quantity, source_lot_version,
        source_location_id, source_position_precision, source_position_row,
        source_position_column, source_position_note, material_name, package_type,
        handling_requirements, resulting_lot_version
      ) values (
        entity_id, outbound_line.source_lot_id, lot.id, outbound_line.quantity, lot.version,
        outbound_line.source_location_id, outbound_line.source_position_precision,
        outbound_line.source_position_row, outbound_line.source_position_column,
        outbound_line.source_position_note, outbound_line.material_name,
        outbound_line.package_type, outbound_line.handling_requirements, lot.version + 1
      );
    end loop;
    insert into public.activity_events (site_id, project_id, entity_type, entity_id, activity_type, description, occurred_at, operator_name, actor_user_id)
    values (p_site_id, outbound.project_id, 'Outbound', entity_id, 'Outbound reversed', 'Departed material restored through reversal.', now_at, operator_name, auth.uid());
    result := jsonb_build_object('entityId', entity_id, 'batchId', entity_id);

  else
    raise exception 'Unsupported inventory command: %', p_command_type using errcode = '0A000';
  end if;

  insert into public.command_receipts (command_id, command_type, command_version, site_id, actor_user_id, actor_name, entity_id, result)
  values (p_command_id, p_command_type, 1, p_site_id, auth.uid(), operator_name, entity_id, result);
  insert into public.audit_records (site_id, actor_user_id, actor_name, action, entity_type, entity_id, command_id, after_state)
  values (p_site_id, auth.uid(), operator_name, p_command_type, split_part(p_command_type, '.', 1), entity_id, p_command_id, result);
  return result || jsonb_build_object('duplicate', false);
end;
$$;

revoke all on function public.execute_inventory_command_v1(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.execute_inventory_command_v1(uuid, text, uuid, jsonb) to authenticated;

grant select on public.receipt_lines to authenticated;
