-- Add the Richardson main-office warehouse as a real Site, seed clearly labeled
-- demonstration inventory, and grant Tech accounts read-only operational visibility.
-- Techs intentionally receive no site_membership row, so the command RPC continues
-- to reject every inventory mutation while SELECT policies can expose the shared record.

insert into public.sites (id, slug, name, active)
values (
  '00000000-0000-4000-8000-000000000002',
  'richardson-office-warehouse',
  'Richardson Office & Warehouse',
  true
)
on conflict (id) do update
set slug = excluded.slug, name = excluded.name, active = excluded.active, updated_at = now();

insert into public.storage_locations (
  id, site_id, slug, name, location_type, zone, notes, active
)
values
  (
    '00000000-0000-4000-8000-000000000111',
    '00000000-0000-4000-8000-000000000002',
    'richardson-indoor-warehouse',
    'Indoor Warehouse',
    'Office',
    'Richardson Main Office',
    'Small indoor warehouse area at the Richardson main office.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000112',
    '00000000-0000-4000-8000-000000000002',
    'richardson-receiving',
    'Receiving Area',
    'Receiving',
    'Richardson Main Office',
    'Temporary receiving and inspection area before indoor storage assignment.',
    true
  )
on conflict (id) do update
set name = excluded.name, location_type = excluded.location_type, zone = excluded.zone,
    notes = excluded.notes, active = excluded.active, updated_at = now();

insert into public.projects (
  id, site_id, slug, name, job_number, status, created_at, updated_at, version
)
values (
  '00000000-0000-4000-8000-000000900001',
  '00000000-0000-4000-8000-000000000002',
  'richardson-warehouse-test-project',
  'Richardson Warehouse Test Project',
  'TEST-RICH-001',
  'Stored',
  '2026-08-18T14:00:00Z',
  '2026-08-18T14:00:00Z',
  1
)
on conflict (id) do update
set site_id = excluded.site_id, name = excluded.name, job_number = excluded.job_number,
    status = excluded.status, updated_at = excluded.updated_at;

insert into public.project_purchase_orders (id, project_id, purchase_order)
values (
  '00000000-0000-4000-8000-000000900002',
  '00000000-0000-4000-8000-000000900001',
  'TEST-PO-RICH-001'
)
on conflict (project_id, purchase_order) do nothing;

insert into public.project_notes (id, project_id, note, display_order)
values
  (
    '00000000-0000-4000-8000-000000900003',
    '00000000-0000-4000-8000-000000900001',
    'Test data for validating the Richardson site. Replace with confirmed project records before production cutover.',
    0
  ),
  (
    '00000000-0000-4000-8000-000000900004',
    '00000000-0000-4000-8000-000000900001',
    'Material names use TBS common wording; supplier descriptions have not been confirmed.',
    1
  )
on conflict (id) do update set note = excluded.note, display_order = excluded.display_order;

insert into public.material_groups (id, project_id, name, description)
values
  ('00000000-0000-4000-8000-000000900010', '00000000-0000-4000-8000-000000900001', 'Fire Extinguishers', 'TBS common material name; supplier catalog description not yet recorded.'),
  ('00000000-0000-4000-8000-000000900011', '00000000-0000-4000-8000-000000900001', 'Toilet Partitions', 'TBS common material name; supplier catalog description not yet recorded.'),
  ('00000000-0000-4000-8000-000000900012', '00000000-0000-4000-8000-000000900001', 'Framed Mirrors', 'TBS common material name; supplier catalog description not yet recorded.')
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.material_lots (
  id, site_id, project_id, group_id, location_id,
  position_precision, position_note, package_type, quantity, presence,
  condition, protection, accessibility, handling_requirements,
  parent_lot_id, root_lot_id, migration_note, created_at, updated_at, version
)
values
  (
    '00000000-0000-4000-8000-000000900020', '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000900001', '00000000-0000-4000-8000-000000900010',
    '00000000-0000-4000-8000-000000000111', 'Unknown', '', 'Box', 12, 'Present',
    'Needs inspection', 'Indoor', 'Accessible', '{}', null,
    '00000000-0000-4000-8000-000000900020',
    'Clearly labeled test inventory for Richardson workflow validation; replace with confirmed records before production cutover.',
    '2026-08-18T14:00:00Z', '2026-08-18T14:00:00Z', 1
  ),
  (
    '00000000-0000-4000-8000-000000900021', '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000900001', '00000000-0000-4000-8000-000000900011',
    '00000000-0000-4000-8000-000000000111', 'Unknown', '', 'Crate', 2, 'Present',
    'Needs inspection', 'Indoor', 'Accessible', '{}', null,
    '00000000-0000-4000-8000-000000900021',
    'Clearly labeled test inventory for Richardson workflow validation; replace with confirmed records before production cutover.',
    '2026-08-18T14:00:00Z', '2026-08-18T14:00:00Z', 1
  ),
  (
    '00000000-0000-4000-8000-000000900022', '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000900001', '00000000-0000-4000-8000-000000900012',
    '00000000-0000-4000-8000-000000000111', 'Unknown', '', 'Crate', 4, 'Present',
    'Needs inspection', 'Indoor', 'Accessible', array['Fragile', 'Keep upright'], null,
    '00000000-0000-4000-8000-000000900022',
    'Clearly labeled test inventory for Richardson workflow validation; replace with confirmed records before production cutover.',
    '2026-08-18T14:00:00Z', '2026-08-18T14:00:00Z', 1
  )
on conflict (id) do update
set location_id = excluded.location_id, package_type = excluded.package_type,
    quantity = excluded.quantity, condition = excluded.condition,
    protection = excluded.protection, accessibility = excluded.accessibility,
    handling_requirements = excluded.handling_requirements,
    migration_note = excluded.migration_note, updated_at = excluded.updated_at;

insert into public.activity_events (
  id, site_id, project_id, entity_type, entity_id, activity_type,
  description, occurred_at, operator_name
)
values (
  '00000000-0000-4000-8000-000000900030',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000900001',
  'Project',
  '00000000-0000-4000-8000-000000900001',
  'Seeded',
  'Richardson test inventory added for multi-site workflow validation.',
  '2026-08-18T14:00:00Z',
  'TBS test data'
)
on conflict (id) do nothing;

-- Operators need the legacy Manager membership value because the existing command
-- function uses it internally for approvals. Techs deliberately receive no membership.
insert into public.site_memberships (site_id, user_id, role, active)
select '00000000-0000-4000-8000-000000000002', profile.id,
       'Manager'::public.app_role, profile.active
from public.profiles profile
where profile.system_role::text = 'Operator'
on conflict (site_id, user_id) do update
set role = 'Manager'::public.app_role, active = excluded.active, updated_at = now();

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
  select coalesce(
    private.is_administrator()
    or (
      (select profile.active and profile.system_role::text = 'Tech'
       from public.profiles profile
       where profile.id = (select auth.uid()))
      and exists (
        select 1 from public.sites site
        where site.id = target_site_id and site.active
      )
    )
    or exists (
      select 1
      from public.site_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.site_id = target_site_id
        and membership.active
        and membership.role = any(allowed_roles)
    ),
    false
  );
$$;

revoke all on function private.has_site_access(uuid, public.app_role[]) from public, anon, authenticated;
grant execute on function private.has_site_access(uuid, public.app_role[]) to authenticated;
