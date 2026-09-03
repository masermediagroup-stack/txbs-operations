-- Add an idempotent, Operator-only project stage command while preserving the
-- existing inventory command implementation for every earlier workflow.

alter function private.execute_inventory_command_v1(uuid, text, uuid, jsonb)
  rename to execute_inventory_command_core_v1;

create function private.execute_inventory_command_v1(
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
  project public.projects%rowtype;
  prior_status text;
  requested_status text;
  expected_version integer;
  change_note text;
  result jsonb;
  now_at timestamptz := now();
begin
  if p_command_type <> 'project.status.update' then
    return private.execute_inventory_command_core_v1(p_command_id, p_command_type, p_site_id, p_payload);
  end if;

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

  if exists (select 1 from public.command_receipts where command_id = p_command_id) then
    raise exception 'Command identity does not match.' using errcode = '42501';
  end if;

  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or not actor.active or actor.system_role::text <> 'Operator' then
    raise exception 'Operator permission is required.' using errcode = '42501';
  end if;

  select * into project
  from public.projects
  where id = (p_payload ->> 'projectId')::uuid
    and site_id = p_site_id
  for update;
  if project.id is null then
    raise exception 'Project not found.' using errcode = 'P0002';
  end if;

  requested_status := p_payload ->> 'status';
  if requested_status not in ('Ordered', 'Shipped', 'Received', 'Stored', 'Ready for Delivery', 'Delivered', 'Installed') then
    raise exception 'Project stage is not valid.' using errcode = '23514';
  end if;

  expected_version := (p_payload ->> 'expectedVersion')::integer;
  if project.version <> expected_version then
    raise exception 'Project stage changed after this page loaded. Review the current stage and try again.' using errcode = '40001';
  end if;
  if project.status = requested_status then
    raise exception 'This project is already %.', requested_status using errcode = '23514';
  end if;

  change_note := left(btrim(coalesce(p_payload ->> 'note', '')), 2000);
  prior_status := project.status;

  update public.projects
  set status = requested_status,
      updated_at = now_at,
      version = version + 1
  where id = project.id;

  insert into public.activity_events (
    site_id, project_id, entity_type, entity_id, activity_type,
    description, occurred_at, operator_name, actor_user_id
  ) values (
    p_site_id,
    project.id,
    'Project',
    project.id,
    'Project stage changed',
    format(
      'Project stage changed from %s to %s.%s',
      prior_status,
      requested_status,
      case when change_note = '' then '' else ' ' || change_note end
    ),
    now_at,
    actor.display_name,
    auth.uid()
  );

  result := jsonb_build_object(
    'entityId', project.id,
    'projectId', project.id,
    'previousStatus', prior_status,
    'status', requested_status,
    'version', project.version + 1
  );

  insert into public.command_receipts (
    command_id, command_type, command_version, site_id, actor_user_id,
    actor_name, entity_id, result
  ) values (
    p_command_id, p_command_type, 1, p_site_id, auth.uid(),
    actor.display_name, project.id, result
  );

  insert into public.audit_records (
    site_id, actor_user_id, actor_name, action, entity_type,
    entity_id, command_id, before_state, after_state
  ) values (
    p_site_id,
    auth.uid(),
    actor.display_name,
    p_command_type,
    'Project',
    project.id,
    p_command_id,
    jsonb_build_object('status', prior_status, 'version', project.version),
    jsonb_build_object('status', requested_status, 'version', project.version + 1, 'note', change_note)
  );

  return result || jsonb_build_object('duplicate', false);
end;
$$;

revoke all on function private.execute_inventory_command_core_v1(uuid, text, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function private.execute_inventory_command_v1(uuid, text, uuid, jsonb)
  from public, anon, authenticated;
