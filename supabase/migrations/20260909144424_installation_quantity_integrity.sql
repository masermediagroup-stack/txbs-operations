alter table public.installation_confirmations add column unknown_quantity_confirmed boolean not null default false;

create or replace function public.execute_field_work_command_v1(
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
declare
  actor public.profiles%rowtype;
  assignment public.field_assignments%rowtype;
  batch public.outbound_batches%rowtype;
  tech public.profiles%rowtype;
  created_confirmation_id uuid;
  created_issue_id uuid;
  photo_id uuid;
  event_status text;
  prior_status text;
  item jsonb;
  line public.outbound_lines%rowtype;
  v_result jsonb;
  v_installed bigint;
  v_quantity integer;
  v_remaining bigint;
  existing public.command_receipts%rowtype;
  photos jsonb := coalesce(p_payload -> 'photoUploads', '[]'::jsonb);
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '28000'; end if;
  select * into actor from public.profiles where id = auth.uid() and active;
  if actor.id is null then raise exception 'This account is not active.' using errcode = '42501'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select * into existing from public.command_receipts where command_id = p_command_id;
  if existing.command_id is not null then
    if existing.actor_user_id <> actor.id or existing.command_type <> p_command_type then raise exception 'Command identity does not match.' using errcode = '42501'; end if;
    return existing.result || jsonb_build_object('duplicate', true);
  end if;

  if p_command_type = 'field.assignment.create' then
    if actor.system_role::text <> 'Operator' or not private.has_site_access(p_site_id) then raise exception 'Operator access is required.' using errcode = '42501'; end if;
    select * into batch from public.outbound_batches where id = (p_payload ->> 'outboundBatchId')::uuid and site_id = p_site_id and state in ('Ready', 'Departed');
    if batch.id is null then raise exception 'Select a Ready or Departed outbound batch.' using errcode = 'P0002'; end if;
    select * into tech from public.profiles where id = (p_payload ->> 'techUserId')::uuid and active and system_role::text = 'Tech';
    if tech.id is null then raise exception 'Select an active Tech account.' using errcode = 'P0002'; end if;
    insert into public.field_assignments (site_id, project_id, outbound_batch_id, assigned_tech_id, assigned_tech_name, due_at, note, assigned_by_user_id, assigned_by_name)
    values (p_site_id, batch.project_id, batch.id, tech.id, tech.display_name, nullif(p_payload ->> 'dueAt', '')::timestamptz, coalesce(p_payload ->> 'note', ''), actor.id, actor.display_name)
    returning * into assignment;
    insert into public.field_assignment_events (assignment_id, event_type, to_status, note, actor_user_id, actor_name) values (assignment.id, 'Assigned', assignment.status, assignment.note, actor.id, actor.display_name);
    v_result := jsonb_build_object('entityId', assignment.id, 'assignmentId', assignment.id);

  elsif p_command_type = 'field.assignment.start' then
    select * into assignment from public.field_assignments where id = (p_payload ->> 'assignmentId')::uuid and site_id = p_site_id for update;
    if assignment.id is null or assignment.assigned_tech_id <> actor.id or assignment.status <> 'Not Started' then raise exception 'This assignment cannot be started by this Tech.' using errcode = '42501'; end if;
    if (p_payload ->> 'expectedVersion') is null or assignment.version <> (p_payload ->> 'expectedVersion')::integer then raise exception 'The assignment changed. Refresh before starting work.' using errcode = '40001'; end if;
    update public.field_assignments set status = 'In Progress', updated_at = now(), version = version + 1 where id = assignment.id returning * into assignment;
    insert into public.field_assignment_events (assignment_id, event_type, from_status, to_status, note, actor_user_id, actor_name) values (assignment.id, 'Started', 'Not Started', 'In Progress', 'Installation work started.', actor.id, actor.display_name);
    v_result := jsonb_build_object('entityId', assignment.id, 'assignmentId', assignment.id, 'version', assignment.version);

  elsif p_command_type = 'field.assignment.cancel' then
    if actor.system_role::text <> 'Operator' or not private.has_site_access(p_site_id) then raise exception 'Operator access is required.' using errcode = '42501'; end if;
    select * into assignment from public.field_assignments where id = (p_payload ->> 'assignmentId')::uuid and site_id = p_site_id for update;
    if assignment.id is null or assignment.status in ('Completed', 'Cancelled') then raise exception 'This assignment cannot be cancelled.' using errcode = '23514'; end if;
    if (p_payload ->> 'expectedVersion') is null or assignment.version <> (p_payload ->> 'expectedVersion')::integer then raise exception 'The assignment changed. Refresh before cancelling it.' using errcode = '40001'; end if;
    prior_status := assignment.status;
    update public.field_assignments set status = 'Cancelled', cancelled_at = now(), updated_at = now(), version = version + 1 where id = assignment.id returning * into assignment;
    insert into public.field_assignment_events (assignment_id, event_type, from_status, to_status, note, actor_user_id, actor_name) values (assignment.id, 'Cancelled', prior_status, 'Cancelled', coalesce(p_payload ->> 'note', 'Assignment cancelled.'), actor.id, actor.display_name);
    v_result := jsonb_build_object('entityId', assignment.id, 'assignmentId', assignment.id);

  elsif p_command_type = 'field.assignment.reassign' then
    if actor.system_role::text <> 'Operator' or not private.has_site_access(p_site_id) then raise exception 'Operator access is required.' using errcode = '42501'; end if;
    select * into assignment from public.field_assignments where id = (p_payload ->> 'assignmentId')::uuid and site_id = p_site_id for update;
    select * into tech from public.profiles where id = (p_payload ->> 'techUserId')::uuid and active and system_role::text = 'Tech';
    if assignment.id is null or assignment.status in ('Completed', 'Cancelled') or tech.id is null then raise exception 'This assignment cannot be reassigned.' using errcode = '23514'; end if;
    if (p_payload ->> 'expectedVersion') is null or assignment.version <> (p_payload ->> 'expectedVersion')::integer then raise exception 'The assignment changed. Refresh before reassigning it.' using errcode = '40001'; end if;
    update public.field_assignments set assigned_tech_id = tech.id, assigned_tech_name = tech.display_name, updated_at = now(), version = version + 1 where id = assignment.id returning * into assignment;
    insert into public.field_assignment_events (assignment_id, event_type, from_status, to_status, note, actor_user_id, actor_name) values (assignment.id, 'Reassigned', assignment.status, assignment.status, 'Reassigned to ' || tech.display_name || '.', actor.id, actor.display_name);
    v_result := jsonb_build_object('entityId', assignment.id, 'assignmentId', assignment.id);

  elsif p_command_type = 'field.installation.confirm' then
    select * into assignment from public.field_assignments where id = (p_payload ->> 'assignmentId')::uuid and site_id = p_site_id for update;
    if assignment.id is null or assignment.assigned_tech_id <> actor.id or assignment.status in ('Completed', 'Cancelled') then raise exception 'This assignment cannot be confirmed by this Tech.' using errcode = '42501'; end if;
    if (p_payload ->> 'expectedVersion') is null or assignment.version <> (p_payload ->> 'expectedVersion')::integer then raise exception 'The assignment changed. Refresh before confirming installation.' using errcode = '40001'; end if;
    if (p_payload ->> 'outcome') not in ('Installed', 'Partially installed', 'Blocked') then raise exception 'Select a valid installation outcome.' using errcode = '23514'; end if;
    select * into batch from public.outbound_batches where id=assignment.outbound_batch_id and site_id=p_site_id for update;
    if batch.id is null or batch.state <> 'Departed' then raise exception 'Record departure before confirming installation.' using errcode='23514'; end if;
    if jsonb_array_length(coalesce(p_payload->'lines','[]'::jsonb)) = 0
       or jsonb_array_length(p_payload->'lines') <> (select count(distinct value->>'outboundLineId') from jsonb_array_elements(p_payload->'lines'))
       or jsonb_array_length(p_payload->'lines') <> (select count(*) from public.outbound_lines where batch_id=batch.id) then
      raise exception 'Submit every delivered line exactly once.' using errcode='23514';
    end if;
    if p_payload->>'outcome'='Blocked' and coalesce(p_payload->'issue','null'::jsonb)='null'::jsonb then
      raise exception 'Blocked installation requires a linked Issue.' using errcode='23514';
    end if;
    if jsonb_array_length(photos) > 3 then raise exception 'Select no more than 3 photos.' using errcode = '23514'; end if;

    insert into public.command_receipts (command_id, command_type, command_version, site_id, actor_user_id, actor_name, result)
    values (p_command_id, p_command_type, 1, p_site_id, actor.id, actor.display_name, '{}'::jsonb);
    insert into public.installation_confirmations (assignment_id, site_id, project_id, tech_user_id, tech_name, outcome, notes, command_id, unknown_quantity_confirmed)
    values (assignment.id, assignment.site_id, assignment.project_id, actor.id, actor.display_name, p_payload ->> 'outcome', coalesce(p_payload ->> 'notes', ''), p_command_id, coalesce((p_payload->>'unknownQuantityConfirmed')::boolean,false))
    returning id into created_confirmation_id;

    for item in select value from jsonb_array_elements(coalesce(p_payload -> 'lines', '[]'::jsonb)) loop
      select * into line from public.outbound_lines where id = (item ->> 'outboundLineId')::uuid and batch_id = assignment.outbound_batch_id;
      if line.id is null then raise exception 'Installation material does not belong to this assignment.' using errcode = '23514'; end if;
      v_quantity := (item->>'installedQuantity')::integer;
      select coalesce(sum(installed_quantity),0) into v_installed from public.installation_lines where outbound_line_id=line.id;
      if v_quantity is null or v_quantity < 0 or (line.quantity is not null and v_installed+v_quantity > line.quantity) then
        raise exception 'Cumulative installed quantity exceeds the delivered quantity.' using errcode='23514';
      end if;
      v_remaining := case when line.quantity is null then null else line.quantity-v_installed-v_quantity end;
      if p_payload->>'outcome'='Installed' and (v_remaining > 0 or (v_remaining is null and not coalesce((p_payload->>'unknownQuantityConfirmed')::boolean,false))) then
        raise exception 'Installed requires no known remainder and explicit confirmation of unknown quantities.' using errcode='23514';
      end if;
      insert into public.installation_lines (confirmation_id,outbound_line_id,material_name,delivered_quantity,installed_quantity,remaining_quantity)
      values (created_confirmation_id,line.id,line.material_name,line.quantity,v_quantity,v_remaining);
    end loop;

    for item in select value from jsonb_array_elements(photos) loop
      photo_id := private.consume_staged_photo((item ->> 'id')::uuid, p_command_id, p_site_id, actor.display_name, item ->> 'fileName', coalesce(item ->> 'photoType', 'Material'), coalesce(item ->> 'caption', 'Installation evidence'), assignment.project_id, null, null, null, null, assignment.outbound_batch_id, null, null, null);
      insert into public.installation_photos (confirmation_id, photo_id) values (created_confirmation_id, photo_id);
    end loop;

    if p_payload ? 'issue' and p_payload -> 'issue' <> 'null'::jsonb then
      if p_payload #>> '{issue,type}' = 'Damaged' and jsonb_array_length(photos) = 0 then raise exception 'Damaged field Issues require at least one photo.' using errcode = '23514'; end if;
      created_issue_id := gen_random_uuid();
      insert into public.issues (id, site_id, project_id, outbound_batch_id, field_assignment_id, issue_type, priority, status, title, description, blocking, idempotency_key, created_at, updated_at, operator_name, actor_user_id)
      values (created_issue_id, p_site_id, assignment.project_id, assignment.outbound_batch_id, assignment.id, p_payload #>> '{issue,type}', coalesce(p_payload #>> '{issue,priority}', 'High'), 'Open', p_payload #>> '{issue,title}', coalesce(p_payload #>> '{issue,description}', ''), true, gen_random_uuid(), now(), now(), actor.display_name, actor.id);
      update public.photos photo
      set issue_id = created_issue_id
      where photo.id in (
        select installation_photo.photo_id
        from public.installation_photos installation_photo
        where installation_photo.confirmation_id = created_confirmation_id
      );
      insert into public.issue_transitions (issue_id, transition_kind, to_status, note, occurred_at, operator_name, actor_user_id) values (created_issue_id, 'Created', 'Open', 'Recorded during field installation.', now(), actor.display_name, actor.id);
    end if;

    prior_status := assignment.status;
    event_status := case p_payload ->> 'outcome' when 'Installed' then 'Completed' when 'Blocked' then 'Blocked' else 'In Progress' end;
    update public.field_assignments set status = event_status, updated_at = now(), version = version + 1 where id = assignment.id returning * into assignment;
    insert into public.field_assignment_events (assignment_id, event_type, from_status, to_status, note, actor_user_id, actor_name) values (assignment.id, 'Installation confirmed', prior_status, event_status, coalesce(p_payload ->> 'notes', ''), actor.id, actor.display_name);
    v_result := jsonb_build_object('entityId', created_confirmation_id, 'assignmentId', assignment.id, 'confirmationId', created_confirmation_id, 'issueId', created_issue_id, 'version', assignment.version);
    update public.command_receipts set entity_id = created_confirmation_id, result = v_result where command_id = p_command_id;
  else
    raise exception 'Unsupported field-work command.' using errcode = '0A000';
  end if;

  if p_command_type <> 'field.installation.confirm' then
    insert into public.command_receipts (command_id, command_type, command_version, site_id, actor_user_id, actor_name, entity_id, result)
    values (p_command_id, p_command_type, 1, p_site_id, actor.id, actor.display_name, (v_result ->> 'entityId')::uuid, v_result);
  end if;
  insert into public.audit_records (site_id, actor_user_id, actor_name, action, entity_type, entity_id, command_id, after_state)
  values (p_site_id, actor.id, actor.display_name, p_command_type, 'FieldAssignment', (v_result ->> 'assignmentId')::uuid, p_command_id, v_result);
  return v_result;
end;
$$;

revoke all on function public.execute_field_work_command_v1(uuid, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.execute_field_work_command_v1(uuid, text, uuid, jsonb) to authenticated;
