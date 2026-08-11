create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$
begin
  create type public.app_role as enum ('Operator', 'Manager', 'Administrator');
exception
  when duplicate_object then null;
end
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  email text not null,
  display_name text not null,
  system_role public.app_role not null default 'Operator',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_present check (length(btrim(display_name)) > 0)
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sites_slug_present check (length(btrim(slug)) > 0),
  constraint sites_name_present check (length(btrim(name)) > 0)
);

create table public.site_memberships (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, user_id),
  constraint site_memberships_administrator_is_global check (role <> 'Administrator')
);

create index site_memberships_user_active_idx on public.site_memberships (user_id, site_id) where active;
create index site_memberships_site_active_idx on public.site_memberships (site_id, user_id) where active;

create or replace function private.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.active and p.system_role = 'Administrator'::public.app_role
     from public.profiles p
     where p.id = (select auth.uid())),
    false
  );
$$;

create or replace function private.has_site_access(
  target_site_id uuid,
  allowed_roles public.app_role[] default array['Operator', 'Manager', 'Administrator']::public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (
      private.is_administrator()
      or exists (
        select 1
        from public.site_memberships membership
        join public.profiles profile on profile.id = membership.user_id
        where membership.user_id = (select auth.uid())
          and membership.site_id = target_site_id
          and membership.active
          and profile.active
          and membership.role = any(allowed_roles)
      )
    );
$$;

create or replace function private.storage_site_id(object_name text)
returns uuid
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

revoke all on function private.is_administrator() from public, anon, authenticated;
revoke all on function private.has_site_access(uuid, public.app_role[]) from public, anon, authenticated;
revoke all on function private.storage_site_id(text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_administrator() to authenticated;
grant execute on function private.has_site_access(uuid, public.app_role[]) to authenticated;
grant execute on function private.storage_site_id(text) to authenticated;

create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  parent_location_id uuid references public.storage_locations(id) on delete restrict,
  slug text not null,
  name text not null,
  location_type text not null,
  zone text not null default '',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, slug),
  constraint storage_locations_type_valid check (location_type in ('Conex', 'Outdoor', 'Office', 'Receiving')),
  constraint storage_locations_name_present check (length(btrim(name)) > 0)
);

create index storage_locations_site_idx on public.storage_locations (site_id, active, name);
create index storage_locations_parent_idx on public.storage_locations (parent_location_id) where parent_location_id is not null;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  slug text not null,
  name text not null,
  job_number text not null default '',
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  unique (site_id, slug),
  constraint projects_status_valid check (status in ('Ordered', 'Shipped', 'Received', 'Stored', 'Ready for Delivery', 'Delivered', 'Installed')),
  constraint projects_name_present check (length(btrim(name)) > 0),
  constraint projects_version_positive check (version > 0)
);

create index projects_site_status_updated_idx on public.projects (site_id, status, updated_at desc);
create index projects_job_number_idx on public.projects (site_id, job_number) where job_number <> '';

create table public.project_aliases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  alias_type text not null,
  value text not null,
  constraint project_aliases_type_valid check (alias_type in ('Alias', 'Field label')),
  constraint project_aliases_value_present check (length(btrim(value)) > 0)
);

create index project_aliases_project_idx on public.project_aliases (project_id);
create index project_aliases_value_lower_idx on public.project_aliases (lower(value));

create table public.project_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  purchase_order text not null,
  unique (project_id, purchase_order),
  constraint project_purchase_orders_value_present check (length(btrim(purchase_order)) > 0)
);

create index project_purchase_orders_project_idx on public.project_purchase_orders (project_id);
create index project_purchase_orders_value_lower_idx on public.project_purchase_orders (lower(purchase_order));

create table public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  note text not null,
  display_order integer not null default 0,
  constraint project_notes_note_present check (length(btrim(note)) > 0)
);

create index project_notes_project_order_idx on public.project_notes (project_id, display_order);

create table public.material_groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  name text not null,
  description text not null default '',
  constraint material_groups_name_present check (length(btrim(name)) > 0)
);

create index material_groups_project_idx on public.material_groups (project_id, name);

create table public.material_lots (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  group_id uuid not null references public.material_groups(id) on delete restrict,
  location_id uuid references public.storage_locations(id) on delete restrict,
  position_precision text not null default 'Unknown',
  position_row text,
  position_column text,
  position_note text not null default '',
  package_type text not null,
  quantity integer,
  presence text not null,
  condition text not null,
  protection text not null,
  accessibility text not null,
  handling_requirements text[] not null default '{}',
  parent_lot_id uuid references public.material_lots(id) on delete restrict,
  root_lot_id uuid not null,
  migration_note text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  version integer not null default 1,
  constraint material_lots_position_precision_valid check (position_precision in ('Exact', 'General', 'Unknown')),
  constraint material_lots_position_row_valid check (position_row is null or position_row in ('Front', 'Middle', 'Back')),
  constraint material_lots_position_column_valid check (position_column is null or position_column in ('Left', 'Center', 'Right')),
  constraint material_lots_package_type_valid check (package_type in ('Pallet', 'Box', 'Crate', 'Bundle', 'Loose', 'Mixed')),
  constraint material_lots_quantity_valid check (quantity is null or quantity >= 0),
  constraint material_lots_presence_valid check (presence in ('Present', 'Removed')),
  constraint material_lots_condition_valid check (condition in ('Good', 'Damaged', 'Needs inspection')),
  constraint material_lots_protection_valid check (protection in ('Indoor', 'Covered', 'Exposed', 'Unknown')),
  constraint material_lots_accessibility_valid check (accessibility in ('Accessible', 'Blocked', 'Restricted', 'Unknown')),
  constraint material_lots_version_positive check (version > 0)
);

alter table public.material_lots
  add constraint material_lots_root_lot_fkey
  foreign key (root_lot_id) references public.material_lots(id) on delete restrict;

create index material_lots_site_presence_idx on public.material_lots (site_id, presence, updated_at desc);
create index material_lots_project_presence_idx on public.material_lots (project_id, presence);
create index material_lots_group_idx on public.material_lots (group_id);
create index material_lots_location_presence_idx on public.material_lots (location_id, presence) where location_id is not null;
create index material_lots_parent_idx on public.material_lots (parent_lot_id) where parent_lot_id is not null;
create index material_lots_root_idx on public.material_lots (root_lot_id);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  staging_location_id uuid references public.storage_locations(id) on delete restrict,
  receipt_number text not null default '',
  identity_state text not null,
  inspection_state text not null,
  status text not null,
  handwritten_project_text text not null default '',
  physical_label_applied boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  constraint receipts_identity_valid check (identity_state in ('Matched', 'Unresolved')),
  constraint receipts_inspection_valid check (inspection_state in ('Pending', 'Passed', 'Exception')),
  constraint receipts_status_valid check (status in ('Draft', 'Received')),
  constraint receipts_operator_present check (length(btrim(operator_name)) > 0),
  constraint receipts_version_positive check (version > 0)
);

create index receipts_site_status_updated_idx on public.receipts (site_id, status, updated_at desc);
create index receipts_project_idx on public.receipts (project_id) where project_id is not null;
create index receipts_number_lower_idx on public.receipts (site_id, lower(receipt_number)) where receipt_number <> '';

create table public.receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete restrict,
  material_name text not null,
  description text not null default '',
  package_type text not null,
  quantity integer,
  condition text not null,
  protection text not null,
  accessibility text not null,
  handling_requirements text[] not null default '{}',
  target_location_id uuid references public.storage_locations(id) on delete restrict,
  constraint receipt_lines_material_present check (length(btrim(material_name)) > 0),
  constraint receipt_lines_package_type_valid check (package_type in ('Pallet', 'Box', 'Crate', 'Bundle', 'Loose', 'Mixed')),
  constraint receipt_lines_quantity_valid check (quantity is null or quantity >= 0),
  constraint receipt_lines_condition_valid check (condition in ('Good', 'Damaged', 'Needs inspection')),
  constraint receipt_lines_protection_valid check (protection in ('Indoor', 'Covered', 'Exposed', 'Unknown')),
  constraint receipt_lines_accessibility_valid check (accessibility in ('Accessible', 'Blocked', 'Restricted', 'Unknown'))
);

create index receipt_lines_receipt_idx on public.receipt_lines (receipt_id);
create index receipt_lines_target_location_idx on public.receipt_lines (target_location_id) where target_location_id is not null;

create table public.material_movements (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  movement_kind text not null,
  reason text not null,
  note text not null default '',
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null,
  client_mutation_id uuid not null unique,
  reversal_of_movement_id uuid references public.material_movements(id) on delete restrict,
  constraint material_movements_kind_valid check (movement_kind in ('Move', 'Reversal')),
  constraint material_movements_reason_present check (length(btrim(reason)) > 0),
  constraint material_movements_operator_present check (length(btrim(operator_name)) > 0)
);

create index material_movements_site_occurred_idx on public.material_movements (site_id, occurred_at desc);
create index material_movements_reversal_idx on public.material_movements (reversal_of_movement_id) where reversal_of_movement_id is not null;

create table public.movement_lines (
  id uuid primary key default gen_random_uuid(),
  movement_id uuid not null references public.material_movements(id) on delete restrict,
  source_lot_id uuid not null references public.material_lots(id) on delete restrict,
  resulting_lot_id uuid not null references public.material_lots(id) on delete restrict,
  source_location_id uuid references public.storage_locations(id) on delete restrict,
  source_position_precision text not null,
  source_position_row text,
  source_position_column text,
  source_position_note text not null default '',
  destination_location_id uuid references public.storage_locations(id) on delete restrict,
  destination_position_precision text not null,
  destination_position_row text,
  destination_position_column text,
  destination_position_note text not null default '',
  quantity integer,
  resulting_lot_version integer not null,
  constraint movement_lines_quantity_valid check (quantity is null or quantity > 0),
  constraint movement_lines_result_version_positive check (resulting_lot_version > 0),
  constraint movement_lines_source_precision_valid check (source_position_precision in ('Exact', 'General', 'Unknown')),
  constraint movement_lines_destination_precision_valid check (destination_position_precision in ('Exact', 'General', 'Unknown'))
);

create index movement_lines_movement_idx on public.movement_lines (movement_id);
create index movement_lines_source_lot_idx on public.movement_lines (source_lot_id);
create index movement_lines_result_lot_idx on public.movement_lines (resulting_lot_id);

create table public.outbound_batches (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  state text not null,
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  carrier_reference text not null default '',
  driver_reference text not null default '',
  note text not null default '',
  planned_at timestamptz not null,
  ready_at timestamptz,
  departed_at timestamptz,
  cancelled_at timestamptz,
  reversed_at timestamptz,
  client_mutation_id uuid not null unique,
  reversal_of_batch_id uuid references public.outbound_batches(id) on delete restrict,
  version integer not null default 1,
  constraint outbound_batches_state_valid check (state in ('Planned', 'Ready', 'Departed', 'Cancelled', 'Reversed')),
  constraint outbound_batches_operator_present check (length(btrim(operator_name)) > 0),
  constraint outbound_batches_version_positive check (version > 0)
);

create index outbound_batches_site_state_idx on public.outbound_batches (site_id, state, planned_at desc);
create index outbound_batches_project_state_idx on public.outbound_batches (project_id, state);
create index outbound_batches_reversal_idx on public.outbound_batches (reversal_of_batch_id) where reversal_of_batch_id is not null;

create table public.outbound_lines (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.outbound_batches(id) on delete restrict,
  source_lot_id uuid not null references public.material_lots(id) on delete restrict,
  resulting_lot_id uuid references public.material_lots(id) on delete restrict,
  quantity integer,
  source_lot_version integer not null,
  source_location_id uuid references public.storage_locations(id) on delete restrict,
  source_position_precision text not null,
  source_position_row text,
  source_position_column text,
  source_position_note text not null default '',
  material_name text not null,
  package_type text not null,
  handling_requirements text[] not null default '{}',
  resulting_lot_version integer,
  constraint outbound_lines_quantity_valid check (quantity is null or quantity > 0),
  constraint outbound_lines_source_version_positive check (source_lot_version > 0),
  constraint outbound_lines_result_version_positive check (resulting_lot_version is null or resulting_lot_version > 0),
  constraint outbound_lines_source_precision_valid check (source_position_precision in ('Exact', 'General', 'Unknown')),
  constraint outbound_lines_package_type_valid check (package_type in ('Pallet', 'Box', 'Crate', 'Bundle', 'Loose', 'Mixed'))
);

create index outbound_lines_batch_idx on public.outbound_lines (batch_id);
create index outbound_lines_source_lot_idx on public.outbound_lines (source_lot_id);
create index outbound_lines_result_lot_idx on public.outbound_lines (resulting_lot_id) where resulting_lot_id is not null;

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  lot_id uuid references public.material_lots(id) on delete restrict,
  receipt_id uuid references public.receipts(id) on delete restrict,
  location_id uuid references public.storage_locations(id) on delete restrict,
  movement_id uuid references public.material_movements(id) on delete restrict,
  outbound_batch_id uuid references public.outbound_batches(id) on delete restrict,
  issue_type text not null,
  priority text not null,
  status text not null,
  title text not null,
  description text not null default '',
  blocking boolean not null default false,
  assignee_name text,
  assignee_user_id uuid references auth.users(id) on delete set null,
  resolution_note text,
  idempotency_key uuid not null unique,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  version integer not null default 1,
  constraint issues_type_valid check (issue_type in ('Missing', 'Damaged', 'Wrong project', 'Wrong quantity', 'Unknown shipment', 'Weather exposure', 'Blocked access', 'Custom')),
  constraint issues_priority_valid check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  constraint issues_status_valid check (status in ('Open', 'In Progress', 'Resolved', 'Dismissed')),
  constraint issues_title_present check (length(btrim(title)) > 0),
  constraint issues_operator_present check (length(btrim(operator_name)) > 0),
  constraint issues_version_positive check (version > 0)
);

create index issues_site_status_priority_idx on public.issues (site_id, status, priority, updated_at desc);
create index issues_project_status_idx on public.issues (project_id, status) where project_id is not null;
create index issues_lot_idx on public.issues (lot_id) where lot_id is not null;
create index issues_receipt_idx on public.issues (receipt_id) where receipt_id is not null;
create index issues_location_idx on public.issues (location_id) where location_id is not null;
create index issues_movement_idx on public.issues (movement_id) where movement_id is not null;
create index issues_outbound_idx on public.issues (outbound_batch_id) where outbound_batch_id is not null;

create table public.issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete restrict,
  body text not null default '',
  created_at timestamptz not null,
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  constraint issue_comments_operator_present check (length(btrim(operator_name)) > 0)
);

create index issue_comments_issue_created_idx on public.issue_comments (issue_id, created_at);

create table public.issue_transitions (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete restrict,
  transition_kind text not null,
  from_status text,
  to_status text not null,
  note text not null,
  occurred_at timestamptz not null,
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  constraint issue_transitions_kind_valid check (transition_kind in ('Created', 'Assigned', 'Linked', 'Status changed')),
  constraint issue_transitions_from_status_valid check (from_status is null or from_status in ('Open', 'In Progress', 'Resolved', 'Dismissed')),
  constraint issue_transitions_to_status_valid check (to_status in ('Open', 'In Progress', 'Resolved', 'Dismissed')),
  constraint issue_transitions_note_present check (length(btrim(note)) > 0),
  constraint issue_transitions_operator_present check (length(btrim(operator_name)) > 0)
);

create index issue_transitions_issue_occurred_idx on public.issue_transitions (issue_id, occurred_at);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  lot_id uuid references public.material_lots(id) on delete restrict,
  receipt_id uuid references public.receipts(id) on delete restrict,
  receipt_line_id uuid references public.receipt_lines(id) on delete restrict,
  movement_id uuid references public.material_movements(id) on delete restrict,
  outbound_batch_id uuid references public.outbound_batches(id) on delete restrict,
  issue_id uuid references public.issues(id) on delete restrict,
  issue_comment_id uuid references public.issue_comments(id) on delete restrict,
  location_id uuid references public.storage_locations(id) on delete restrict,
  photo_type text not null,
  caption text not null default '',
  file_name text not null,
  content_type text not null,
  bucket_id text not null default 'operational-media',
  object_path text not null unique,
  checksum_sha256 text,
  size_bytes bigint,
  taken_at timestamptz not null,
  uploaded_at timestamptz not null,
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  constraint photos_type_valid check (photo_type in ('Material', 'Label', 'Condition', 'Location', 'Document')),
  constraint photos_file_name_present check (length(btrim(file_name)) > 0),
  constraint photos_content_type_image check (content_type like 'image/%'),
  constraint photos_path_present check (length(btrim(object_path)) > 0),
  constraint photos_size_valid check (size_bytes is null or size_bytes > 0),
  constraint photos_operator_present check (length(btrim(operator_name)) > 0)
);

create index photos_site_uploaded_idx on public.photos (site_id, uploaded_at desc);
create index photos_project_idx on public.photos (project_id) where project_id is not null;
create index photos_lot_idx on public.photos (lot_id) where lot_id is not null;
create index photos_receipt_idx on public.photos (receipt_id) where receipt_id is not null;
create index photos_receipt_line_idx on public.photos (receipt_line_id) where receipt_line_id is not null;
create index photos_movement_idx on public.photos (movement_id) where movement_id is not null;
create index photos_outbound_idx on public.photos (outbound_batch_id) where outbound_batch_id is not null;
create index photos_issue_idx on public.photos (issue_id) where issue_id is not null;
create index photos_issue_comment_idx on public.photos (issue_comment_id) where issue_comment_id is not null;
create index photos_location_idx on public.photos (location_id) where location_id is not null;

create table public.verification_records (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.material_lots(id) on delete restrict,
  verified_at timestamptz not null,
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  location_id uuid references public.storage_locations(id) on delete restrict,
  position_precision text not null,
  position_row text,
  position_column text,
  position_note text not null default '',
  note text not null default '',
  constraint verification_records_precision_valid check (position_precision in ('Exact', 'General', 'Unknown')),
  constraint verification_records_operator_present check (length(btrim(operator_name)) > 0)
);

create index verification_records_lot_verified_idx on public.verification_records (lot_id, verified_at desc);
create index verification_records_location_idx on public.verification_records (location_id) where location_id is not null;

create table public.verification_photos (
  verification_id uuid not null references public.verification_records(id) on delete restrict,
  photo_id uuid not null references public.photos(id) on delete restrict,
  primary key (verification_id, photo_id)
);

create index verification_photos_photo_idx on public.verification_photos (photo_id);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  activity_type text not null,
  description text not null,
  occurred_at timestamptz not null,
  operator_name text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  constraint activity_events_entity_type_valid check (entity_type in ('Project', 'Lot', 'Photo', 'Issue', 'Receipt', 'Movement', 'Outbound')),
  constraint activity_events_operator_present check (length(btrim(operator_name)) > 0)
);

create index activity_events_site_occurred_idx on public.activity_events (site_id, occurred_at desc);
create index activity_events_project_occurred_idx on public.activity_events (project_id, occurred_at desc) where project_id is not null;
create index activity_events_entity_idx on public.activity_events (entity_type, entity_id, occurred_at desc);

create table public.command_receipts (
  command_id uuid primary key,
  command_type text not null,
  command_version integer not null,
  site_id uuid not null references public.sites(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_name text not null,
  entity_id uuid,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint command_receipts_type_present check (length(btrim(command_type)) > 0),
  constraint command_receipts_version_positive check (command_version > 0),
  constraint command_receipts_actor_present check (length(btrim(actor_name)) > 0)
);

create index command_receipts_site_created_idx on public.command_receipts (site_id, created_at desc);
create index command_receipts_actor_created_idx on public.command_receipts (actor_user_id, created_at desc);

create table public.audit_records (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  command_id uuid references public.command_receipts(command_id) on delete restrict,
  before_state jsonb,
  after_state jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_records_actor_present check (length(btrim(actor_name)) > 0),
  constraint audit_records_action_present check (length(btrim(action)) > 0),
  constraint audit_records_entity_type_present check (length(btrim(entity_type)) > 0)
);

create index audit_records_site_occurred_idx on public.audit_records (site_id, occurred_at desc) where site_id is not null;
create index audit_records_entity_idx on public.audit_records (entity_type, entity_id, occurred_at desc);
create index audit_records_command_idx on public.audit_records (command_id) where command_id is not null;

create table public.staged_uploads (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  command_id uuid not null,
  bucket_id text not null default 'operational-media',
  object_path text not null unique,
  content_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint staged_uploads_content_type_image check (content_type like 'image/%'),
  constraint staged_uploads_size_positive check (size_bytes > 0),
  unique (command_id, object_path)
);

create index staged_uploads_actor_created_idx on public.staged_uploads (actor_user_id, created_at desc);
create index staged_uploads_unconsumed_idx on public.staged_uploads (site_id, created_at) where consumed_at is null;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function private.touch_updated_at();
create trigger sites_touch_updated_at before update on public.sites for each row execute function private.touch_updated_at();
create trigger memberships_touch_updated_at before update on public.site_memberships for each row execute function private.touch_updated_at();
create trigger locations_touch_updated_at before update on public.storage_locations for each row execute function private.touch_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Pending user'),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

create or replace function private.reject_append_only_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create trigger activity_events_append_only before update or delete on public.activity_events for each row execute function private.reject_append_only_change();
create trigger audit_records_append_only before update or delete on public.audit_records for each row execute function private.reject_append_only_change();
create trigger issue_comments_append_only before update or delete on public.issue_comments for each row execute function private.reject_append_only_change();
create trigger issue_transitions_append_only before update or delete on public.issue_transitions for each row execute function private.reject_append_only_change();

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.site_memberships enable row level security;
alter table public.storage_locations enable row level security;
alter table public.projects enable row level security;
alter table public.project_aliases enable row level security;
alter table public.project_purchase_orders enable row level security;
alter table public.project_notes enable row level security;
alter table public.material_groups enable row level security;
alter table public.material_lots enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_lines enable row level security;
alter table public.material_movements enable row level security;
alter table public.movement_lines enable row level security;
alter table public.outbound_batches enable row level security;
alter table public.outbound_lines enable row level security;
alter table public.issues enable row level security;
alter table public.issue_comments enable row level security;
alter table public.issue_transitions enable row level security;
alter table public.photos enable row level security;
alter table public.verification_records enable row level security;
alter table public.verification_photos enable row level security;
alter table public.activity_events enable row level security;
alter table public.command_receipts enable row level security;
alter table public.audit_records enable row level security;
alter table public.staged_uploads enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_administrator());

create policy sites_select on public.sites for select to authenticated
using (private.has_site_access(id));

create policy memberships_select on public.site_memberships for select to authenticated
using (user_id = (select auth.uid()) or private.is_administrator());

create policy locations_select on public.storage_locations for select to authenticated
using (private.has_site_access(site_id));

create policy projects_select on public.projects for select to authenticated
using (private.has_site_access(site_id));

create policy aliases_select on public.project_aliases for select to authenticated
using (exists (select 1 from public.projects project where project.id = project_aliases.project_id and private.has_site_access(project.site_id)));

create policy purchase_orders_select on public.project_purchase_orders for select to authenticated
using (exists (select 1 from public.projects project where project.id = project_purchase_orders.project_id and private.has_site_access(project.site_id)));

create policy project_notes_select on public.project_notes for select to authenticated
using (exists (select 1 from public.projects project where project.id = project_notes.project_id and private.has_site_access(project.site_id)));

create policy groups_select on public.material_groups for select to authenticated
using (exists (select 1 from public.projects project where project.id = material_groups.project_id and private.has_site_access(project.site_id)));

create policy lots_select on public.material_lots for select to authenticated
using (private.has_site_access(site_id));

create policy receipts_select on public.receipts for select to authenticated
using (private.has_site_access(site_id));

create policy receipt_lines_select on public.receipt_lines for select to authenticated
using (exists (select 1 from public.receipts receipt where receipt.id = receipt_id and private.has_site_access(receipt.site_id)));

create policy movements_select on public.material_movements for select to authenticated
using (private.has_site_access(site_id));

create policy movement_lines_select on public.movement_lines for select to authenticated
using (exists (select 1 from public.material_movements movement where movement.id = movement_id and private.has_site_access(movement.site_id)));

create policy outbound_batches_select on public.outbound_batches for select to authenticated
using (private.has_site_access(site_id));

create policy outbound_lines_select on public.outbound_lines for select to authenticated
using (exists (select 1 from public.outbound_batches batch where batch.id = batch_id and private.has_site_access(batch.site_id)));

create policy issues_select on public.issues for select to authenticated
using (private.has_site_access(site_id));

create policy issue_comments_select on public.issue_comments for select to authenticated
using (exists (select 1 from public.issues issue where issue.id = issue_id and private.has_site_access(issue.site_id)));

create policy issue_transitions_select on public.issue_transitions for select to authenticated
using (exists (select 1 from public.issues issue where issue.id = issue_id and private.has_site_access(issue.site_id)));

create policy photos_select on public.photos for select to authenticated
using (private.has_site_access(site_id));

create policy verifications_select on public.verification_records for select to authenticated
using (exists (select 1 from public.material_lots lot where lot.id = lot_id and private.has_site_access(lot.site_id)));

create policy verification_photos_select on public.verification_photos for select to authenticated
using (exists (
  select 1
  from public.verification_records verification
  join public.material_lots lot on lot.id = verification.lot_id
  where verification.id = verification_id and private.has_site_access(lot.site_id)
));

create policy activity_select on public.activity_events for select to authenticated
using (private.has_site_access(site_id));

create policy command_receipts_select on public.command_receipts for select to authenticated
using (actor_user_id = (select auth.uid()) and private.has_site_access(site_id));

create policy audit_select on public.audit_records for select to authenticated
using (
  private.is_administrator()
  or (site_id is not null and private.has_site_access(site_id, array['Manager', 'Administrator']::public.app_role[]))
);

create policy staged_uploads_select on public.staged_uploads for select to authenticated
using (actor_user_id = (select auth.uid()) and private.has_site_access(site_id));

create policy staged_uploads_insert on public.staged_uploads for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and private.has_site_access(site_id, array['Operator', 'Manager', 'Administrator']::public.app_role[])
  and private.storage_site_id(object_path) = site_id
);

create policy staged_uploads_update on public.staged_uploads for update to authenticated
using (actor_user_id = (select auth.uid()) and private.has_site_access(site_id))
with check (actor_user_id = (select auth.uid()) and private.has_site_access(site_id) and private.storage_site_id(object_path) = site_id);

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant usage on schema public to authenticated;
grant select on table
  public.profiles,
  public.sites,
  public.site_memberships,
  public.storage_locations,
  public.projects,
  public.project_aliases,
  public.project_purchase_orders,
  public.project_notes,
  public.material_groups,
  public.material_lots,
  public.receipts,
  public.receipt_lines,
  public.material_movements,
  public.movement_lines,
  public.outbound_batches,
  public.outbound_lines,
  public.issues,
  public.issue_comments,
  public.issue_transitions,
  public.photos,
  public.verification_records,
  public.verification_photos,
  public.activity_events,
  public.command_receipts,
  public.audit_records,
  public.staged_uploads
to authenticated;
grant insert, update on public.staged_uploads to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'operational-media',
  'operational-media',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy operational_media_select on storage.objects for select to authenticated
using (
  bucket_id = 'operational-media'
  and private.has_site_access(private.storage_site_id(name))
);

create policy operational_media_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'operational-media'
  and owner_id = (select auth.uid()::text)
  and private.has_site_access(private.storage_site_id(name), array['Operator', 'Manager', 'Administrator']::public.app_role[])
);

create policy operational_media_update on storage.objects for update to authenticated
using (
  bucket_id = 'operational-media'
  and owner_id = (select auth.uid()::text)
  and private.has_site_access(private.storage_site_id(name))
)
with check (
  bucket_id = 'operational-media'
  and owner_id = (select auth.uid()::text)
  and private.has_site_access(private.storage_site_id(name))
);

create policy operational_media_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'operational-media'
  and private.has_site_access(private.storage_site_id(name), array['Manager', 'Administrator']::public.app_role[])
);

insert into public.sites (id, slug, name, active)
values ('00000000-0000-4000-8000-000000000001', 'lavon-yard', 'Lavon Yard', true)
on conflict (id) do update set slug = excluded.slug, name = excluded.name, active = excluded.active;

insert into public.storage_locations (id, site_id, slug, name, location_type, zone, notes)
values
  ('00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-000000000001', 'conex-1', 'Conex 1', 'Conex', 'Lavon Yard', 'Keep project labels visible from the center aisle.'),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'conex-2', 'Conex 2', 'Conex', 'Lavon Yard', 'Keep project labels visible from the center aisle.'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'conex-3', 'Conex 3', 'Conex', 'Lavon Yard', 'Keep project labels visible from the center aisle.'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'conex-4', 'Conex 4', 'Conex', 'Lavon Yard', 'Keep project labels visible from the center aisle.'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'conex-5', 'Conex 5', 'Conex', 'Lavon Yard', 'Keep project labels visible from the center aisle.'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'conex-6', 'Conex 6', 'Conex', 'Lavon Yard', 'Keep project labels visible from the center aisle.'),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', 'conex-7', 'Conex 7', 'Conex', 'Lavon Yard', 'Keep project labels visible from the center aisle.'),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', 'north-yard', 'North Yard', 'Outdoor', 'North Yard', 'Open storage area along the north side of the Lavon Yard.'),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000001', 'middle-yard', 'Middle Yard', 'Outdoor', 'Middle Yard', 'Central open storage and staging area within the Lavon Yard.'),
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000001', 'south-yard', 'South Yard', 'Outdoor', 'South Yard', 'Open storage area along the south side of the Lavon Yard.')
on conflict (id) do update
set site_id = excluded.site_id,
    slug = excluded.slug,
    name = excluded.name,
    location_type = excluded.location_type,
    zone = excluded.zone,
    notes = excluded.notes,
    active = true;
