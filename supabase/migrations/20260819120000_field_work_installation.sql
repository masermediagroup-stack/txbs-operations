-- Durable Operator assignment and Tech installation confirmation for the demo.
-- Supabase CLI `migration new` could not create this file in the OneDrive-backed
-- workspace (LegacyMigrationNewWriteError), so the ordered migration is recorded here.

create table public.field_assignments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  outbound_batch_id uuid references public.outbound_batches(id) on delete restrict,
  assigned_tech_id uuid not null references public.profiles(id) on delete restrict,
  assigned_tech_name text not null,
  status text not null default 'Not Started',
  due_at timestamptz,
  note text not null default '',
  assigned_by_user_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by_name text not null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  version integer not null default 1,
  constraint field_assignments_status_valid check (status in ('Not Started', 'In Progress', 'Blocked', 'Completed', 'Cancelled')),
  constraint field_assignments_names_present check (length(btrim(assigned_tech_name)) > 0 and length(btrim(assigned_by_name)) > 0),
  constraint field_assignments_version_positive check (version > 0)
);

create index field_assignments_tech_status_idx on public.field_assignments (assigned_tech_id, status, updated_at desc);
create index field_assignments_site_status_idx on public.field_assignments (site_id, status, updated_at desc);
create index field_assignments_outbound_idx on public.field_assignments (outbound_batch_id) where outbound_batch_id is not null;
create unique index field_assignments_active_outbound_idx on public.field_assignments (outbound_batch_id)
where outbound_batch_id is not null and status in ('Not Started', 'In Progress', 'Blocked');

create table public.field_assignment_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.field_assignments(id) on delete restrict,
  event_type text not null,
  from_status text,
  to_status text not null,
  note text not null default '',
  occurred_at timestamptz not null default now(),
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  actor_name text not null,
  constraint field_assignment_events_type_present check (length(btrim(event_type)) > 0),
  constraint field_assignment_events_status_valid check (to_status in ('Not Started', 'In Progress', 'Blocked', 'Completed', 'Cancelled')),
  constraint field_assignment_events_actor_present check (length(btrim(actor_name)) > 0)
);

create index field_assignment_events_assignment_idx on public.field_assignment_events (assignment_id, occurred_at);

create table public.installation_confirmations (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.field_assignments(id) on delete restrict,
  site_id uuid not null references public.sites(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  tech_user_id uuid not null references public.profiles(id) on delete restrict,
  tech_name text not null,
  outcome text not null,
  notes text not null default '',
  confirmed_at timestamptz not null default now(),
  command_id uuid not null unique references public.command_receipts(command_id) on delete restrict,
  constraint installation_confirmations_outcome_valid check (outcome in ('Installed', 'Partially installed', 'Blocked')),
  constraint installation_confirmations_tech_present check (length(btrim(tech_name)) > 0)
);

create index installation_confirmations_assignment_idx on public.installation_confirmations (assignment_id, confirmed_at desc);

create table public.installation_lines (
  id uuid primary key default gen_random_uuid(),
  confirmation_id uuid not null references public.installation_confirmations(id) on delete restrict,
  outbound_line_id uuid references public.outbound_lines(id) on delete restrict,
  material_name text not null,
  delivered_quantity integer,
  installed_quantity integer not null,
  remaining_quantity integer,
  constraint installation_lines_material_present check (length(btrim(material_name)) > 0),
  constraint installation_lines_quantity_valid check (
    installed_quantity >= 0
    and (delivered_quantity is null or delivered_quantity > 0)
    and (remaining_quantity is null or remaining_quantity >= 0)
    and (delivered_quantity is null or installed_quantity <= delivered_quantity)
  )
);

create index installation_lines_confirmation_idx on public.installation_lines (confirmation_id);

create table public.installation_photos (
  confirmation_id uuid not null references public.installation_confirmations(id) on delete restrict,
  photo_id uuid not null references public.photos(id) on delete restrict,
  primary key (confirmation_id, photo_id)
);

alter table public.issues add column if not exists field_assignment_id uuid references public.field_assignments(id) on delete restrict;
create index if not exists issues_field_assignment_idx on public.issues (field_assignment_id) where field_assignment_id is not null;

alter table public.field_assignments enable row level security;
alter table public.field_assignment_events enable row level security;
alter table public.installation_confirmations enable row level security;
alter table public.installation_lines enable row level security;
alter table public.installation_photos enable row level security;

create policy field_assignments_select on public.field_assignments for select to authenticated using (
  private.has_site_access(site_id) or assigned_tech_id = (select auth.uid())
);
create policy field_assignment_events_select on public.field_assignment_events for select to authenticated using (
  exists (select 1 from public.field_assignments assignment where assignment.id = field_assignment_events.assignment_id and (private.has_site_access(assignment.site_id) or assignment.assigned_tech_id = (select auth.uid())))
);
create policy installation_confirmations_select on public.installation_confirmations for select to authenticated using (
  private.has_site_access(site_id) or tech_user_id = (select auth.uid())
);
create policy installation_lines_select on public.installation_lines for select to authenticated using (
  exists (select 1 from public.installation_confirmations confirmation where confirmation.id = installation_lines.confirmation_id and (private.has_site_access(confirmation.site_id) or confirmation.tech_user_id = (select auth.uid())))
);
create policy installation_photos_select on public.installation_photos for select to authenticated using (
  exists (select 1 from public.installation_confirmations confirmation where confirmation.id = installation_photos.confirmation_id and (private.has_site_access(confirmation.site_id) or confirmation.tech_user_id = (select auth.uid())))
);

grant select on public.field_assignments, public.field_assignment_events, public.installation_confirmations, public.installation_lines, public.installation_photos to authenticated;

-- Tech uploads remain private and can only be consumed by a command for the
-- Tech's own assignment. Unconsumed uploads are still visible only to their owner.
create policy staged_uploads_tech_select on public.staged_uploads for select to authenticated
using (actor_user_id = (select auth.uid()) and private.has_tech_read_access(site_id));
create policy staged_uploads_tech_insert on public.staged_uploads for insert to authenticated
with check (actor_user_id = (select auth.uid()) and private.has_tech_read_access(site_id) and private.storage_site_id(object_path) = site_id);
create policy staged_uploads_tech_update on public.staged_uploads for update to authenticated
using (actor_user_id = (select auth.uid()) and private.has_tech_read_access(site_id))
with check (actor_user_id = (select auth.uid()) and private.has_tech_read_access(site_id) and private.storage_site_id(object_path) = site_id);
create policy operational_media_tech_insert on storage.objects for insert to authenticated
with check (bucket_id = 'operational-media' and owner_id = (select auth.uid()::text) and private.has_tech_read_access(private.storage_site_id(name)));
create policy operational_media_tech_own_select on storage.objects for select to authenticated
using (bucket_id = 'operational-media' and owner_id = (select auth.uid()::text) and private.has_tech_read_access(private.storage_site_id(name)));

create or replace function public.get_field_work_snapshot_v1()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  actor public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication is required.' using errcode = '28000'; end if;
  select * into actor from public.profiles where id = auth.uid() and active;
  if actor.id is null then raise exception 'This account is not active.' using errcode = '42501'; end if;

  return jsonb_build_object(
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', assignment.id,
        'siteId', assignment.site_id,
        'projectId', assignment.project_id,
        'outboundBatchId', assignment.outbound_batch_id,
        'assignedTechId', assignment.assigned_tech_id,
        'assignedTechName', assignment.assigned_tech_name,
        'status', assignment.status,
        'dueAt', assignment.due_at,
        'note', assignment.note,
        'assignedByUserId', assignment.assigned_by_user_id,
        'assignedByName', assignment.assigned_by_name,
        'assignedAt', assignment.assigned_at,
        'updatedAt', assignment.updated_at,
        'cancelledAt', assignment.cancelled_at,
        'version', assignment.version
      ) order by assignment.updated_at desc)
      from public.field_assignments assignment
      where private.has_site_access(assignment.site_id) or assignment.assigned_tech_id = actor.id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', event.id,
        'assignmentId', event.assignment_id,
        'eventType', event.event_type,
        'fromStatus', event.from_status,
        'toStatus', event.to_status,
        'note', event.note,
        'occurredAt', event.occurred_at,
        'actorUserId', event.actor_user_id,
        'actorName', event.actor_name
      ) order by event.occurred_at desc)
      from public.field_assignment_events event
      join public.field_assignments assignment on assignment.id = event.assignment_id
      where private.has_site_access(assignment.site_id) or assignment.assigned_tech_id = actor.id
    ), '[]'::jsonb),
    'confirmations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', confirmation.id,
        'assignmentId', confirmation.assignment_id,
        'siteId', confirmation.site_id,
        'projectId', confirmation.project_id,
        'techUserId', confirmation.tech_user_id,
        'techName', confirmation.tech_name,
        'outcome', confirmation.outcome,
        'notes', confirmation.notes,
        'confirmedAt', confirmation.confirmed_at,
        'commandId', confirmation.command_id
      ) order by confirmation.confirmed_at desc)
      from public.installation_confirmations confirmation
      where private.has_site_access(confirmation.site_id) or confirmation.tech_user_id = actor.id
    ), '[]'::jsonb),
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', line.id,
        'confirmationId', line.confirmation_id,
        'outboundLineId', line.outbound_line_id,
        'materialName', line.material_name,
        'deliveredQuantity', line.delivered_quantity,
        'installedQuantity', line.installed_quantity,
        'remainingQuantity', line.remaining_quantity
      ))
      from public.installation_lines line
      join public.installation_confirmations confirmation on confirmation.id = line.confirmation_id
      where private.has_site_access(confirmation.site_id) or confirmation.tech_user_id = actor.id
    ), '[]'::jsonb),
    'installationPhotos', coalesce((
      select jsonb_agg(jsonb_build_object('confirmationId', link.confirmation_id, 'photoId', link.photo_id))
      from public.installation_photos link
      join public.installation_confirmations confirmation on confirmation.id = link.confirmation_id
      where private.has_site_access(confirmation.site_id) or confirmation.tech_user_id = actor.id
    ), '[]'::jsonb),
    'techs', case when actor.system_role::text = 'Operator' then coalesce((
      select jsonb_agg(jsonb_build_object('id', profile.id, 'displayName', profile.display_name, 'email', profile.email) order by profile.display_name)
      from public.profiles profile
      where profile.active and profile.system_role::text = 'Tech'
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

revoke all on function public.get_field_work_snapshot_v1() from public, anon, authenticated;
grant execute on function public.get_field_work_snapshot_v1() to authenticated;

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
  result jsonb;
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
    result := jsonb_build_object('entityId', assignment.id, 'assignmentId', assignment.id);

  elsif p_command_type = 'field.assignment.start' then
    select * into assignment from public.field_assignments where id = (p_payload ->> 'assignmentId')::uuid and site_id = p_site_id for update;
    if assignment.id is null or assignment.assigned_tech_id <> actor.id or assignment.status <> 'Not Started' then raise exception 'This assignment cannot be started by this Tech.' using errcode = '42501'; end if;
    if assignment.version <> (p_payload ->> 'expectedVersion')::integer then raise exception 'The assignment changed. Refresh before starting work.' using errcode = '40001'; end if;
    update public.field_assignments set status = 'In Progress', updated_at = now(), version = version + 1 where id = assignment.id returning * into assignment;
    insert into public.field_assignment_events (assignment_id, event_type, from_status, to_status, note, actor_user_id, actor_name) values (assignment.id, 'Started', 'Not Started', 'In Progress', 'Installation work started.', actor.id, actor.display_name);
    result := jsonb_build_object('entityId', assignment.id, 'assignmentId', assignment.id, 'version', assignment.version);

  elsif p_command_type = 'field.assignment.cancel' then
    if actor.system_role::text <> 'Operator' or not private.has_site_access(p_site_id) then raise exception 'Operator access is required.' using errcode = '42501'; end if;
    select * into assignment from public.field_assignments where id = (p_payload ->> 'assignmentId')::uuid and site_id = p_site_id for update;
    if assignment.id is null or assignment.status in ('Completed', 'Cancelled') then raise exception 'This assignment cannot be cancelled.' using errcode = '23514'; end if;
    if assignment.version <> (p_payload ->> 'expectedVersion')::integer then raise exception 'The assignment changed. Refresh before cancelling it.' using errcode = '40001'; end if;
    prior_status := assignment.status;
    update public.field_assignments set status = 'Cancelled', cancelled_at = now(), updated_at = now(), version = version + 1 where id = assignment.id returning * into assignment;
    insert into public.field_assignment_events (assignment_id, event_type, from_status, to_status, note, actor_user_id, actor_name) values (assignment.id, 'Cancelled', prior_status, 'Cancelled', coalesce(p_payload ->> 'note', 'Assignment cancelled.'), actor.id, actor.display_name);
    result := jsonb_build_object('entityId', assignment.id, 'assignmentId', assignment.id);

  elsif p_command_type = 'field.assignment.reassign' then
    if actor.system_role::text <> 'Operator' or not private.has_site_access(p_site_id) then raise exception 'Operator access is required.' using errcode = '42501'; end if;
    select * into assignment from public.field_assignments where id = (p_payload ->> 'assignmentId')::uuid and site_id = p_site_id for update;
    select * into tech from public.profiles where id = (p_payload ->> 'techUserId')::uuid and active and system_role::text = 'Tech';
    if assignment.id is null or assignment.status in ('Completed', 'Cancelled') or tech.id is null then raise exception 'This assignment cannot be reassigned.' using errcode = '23514'; end if;
    if assignment.version <> (p_payload ->> 'expectedVersion')::integer then raise exception 'The assignment changed. Refresh before reassigning it.' using errcode = '40001'; end if;
    update public.field_assignments set assigned_tech_id = tech.id, assigned_tech_name = tech.display_name, updated_at = now(), version = version + 1 where id = assignment.id returning * into assignment;
    insert into public.field_assignment_events (assignment_id, event_type, from_status, to_status, note, actor_user_id, actor_name) values (assignment.id, 'Reassigned', assignment.status, assignment.status, 'Reassigned to ' || tech.display_name || '.', actor.id, actor.display_name);
    result := jsonb_build_object('entityId', assignment.id, 'assignmentId', assignment.id);

  elsif p_command_type = 'field.installation.confirm' then
    select * into assignment from public.field_assignments where id = (p_payload ->> 'assignmentId')::uuid and site_id = p_site_id for update;
    if assignment.id is null or assignment.assigned_tech_id <> actor.id or assignment.status in ('Completed', 'Cancelled') then raise exception 'This assignment cannot be confirmed by this Tech.' using errcode = '42501'; end if;
    if assignment.version <> (p_payload ->> 'expectedVersion')::integer then raise exception 'The assignment changed. Refresh before confirming installation.' using errcode = '40001'; end if;
    if (p_payload ->> 'outcome') not in ('Installed', 'Partially installed', 'Blocked') then raise exception 'Select a valid installation outcome.' using errcode = '23514'; end if;
    if jsonb_array_length(photos) > 3 then raise exception 'Select no more than 3 photos.' using errcode = '23514'; end if;

    insert into public.command_receipts (command_id, command_type, command_version, site_id, actor_user_id, actor_name, result)
    values (p_command_id, p_command_type, 1, p_site_id, actor.id, actor.display_name, '{}'::jsonb);
    insert into public.installation_confirmations (assignment_id, site_id, project_id, tech_user_id, tech_name, outcome, notes, command_id)
    values (assignment.id, assignment.site_id, assignment.project_id, actor.id, actor.display_name, p_payload ->> 'outcome', coalesce(p_payload ->> 'notes', ''), p_command_id)
    returning id into created_confirmation_id;

    for item in select value from jsonb_array_elements(coalesce(p_payload -> 'lines', '[]'::jsonb)) loop
      select * into line from public.outbound_lines where id = (item ->> 'outboundLineId')::uuid and batch_id = assignment.outbound_batch_id;
      if line.id is null then raise exception 'Installation material does not belong to this assignment.' using errcode = '23514'; end if;
      if (item ->> 'installedQuantity')::integer < 0 or (line.quantity is not null and (item ->> 'installedQuantity')::integer > line.quantity) then raise exception 'Installed quantity is outside the delivered quantity.' using errcode = '23514'; end if;
      insert into public.installation_lines (confirmation_id, outbound_line_id, material_name, delivered_quantity, installed_quantity, remaining_quantity)
      values (created_confirmation_id, line.id, line.material_name, line.quantity, (item ->> 'installedQuantity')::integer, case when line.quantity is null then null else line.quantity - (item ->> 'installedQuantity')::integer end);
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
    result := jsonb_build_object('entityId', created_confirmation_id, 'assignmentId', assignment.id, 'confirmationId', created_confirmation_id, 'issueId', created_issue_id, 'version', assignment.version);
    update public.command_receipts set entity_id = created_confirmation_id, result = result where command_id = p_command_id;
  else
    raise exception 'Unsupported field-work command.' using errcode = '0A000';
  end if;

  if p_command_type <> 'field.installation.confirm' then
    insert into public.command_receipts (command_id, command_type, command_version, site_id, actor_user_id, actor_name, entity_id, result)
    values (p_command_id, p_command_type, 1, p_site_id, actor.id, actor.display_name, (result ->> 'entityId')::uuid, result);
  end if;
  insert into public.audit_records (site_id, actor_user_id, actor_name, action, entity_type, entity_id, command_id, after_state)
  values (p_site_id, actor.id, actor.display_name, p_command_type, 'FieldAssignment', (result ->> 'assignmentId')::uuid, p_command_id, result);
  return result;
end;
$$;

revoke all on function public.execute_field_work_command_v1(uuid, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.execute_field_work_command_v1(uuid, text, uuid, jsonb) to authenticated;
