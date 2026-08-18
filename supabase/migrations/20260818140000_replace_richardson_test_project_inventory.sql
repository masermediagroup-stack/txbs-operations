-- Remove the standalone Richardson test project and represent the actual
-- multi-site scenario: portions of existing Ramer and Plano West material are
-- stored in the Richardson indoor warehouse. Quantities are demonstration data
-- and preserve the original project totals through split-lot lineage.

-- The only linked ActivityEvent is synthetic seed history. Temporarily suspend
-- the append-only guard for this narrowly identified cleanup, then restore it
-- before applying the replacement demo allocations.
alter table public.activity_events disable trigger activity_events_append_only;

delete from public.activity_events
where project_id = '00000000-0000-4000-8000-000000900001';

alter table public.activity_events enable trigger activity_events_append_only;

delete from public.material_lots
where project_id = '00000000-0000-4000-8000-000000900001';

delete from public.material_groups
where project_id = '00000000-0000-4000-8000-000000900001';

delete from public.project_aliases
where project_id = '00000000-0000-4000-8000-000000900001';

delete from public.project_purchase_orders
where project_id = '00000000-0000-4000-8000-000000900001';

delete from public.project_notes
where project_id = '00000000-0000-4000-8000-000000900001';

delete from public.projects
where id = '00000000-0000-4000-8000-000000900001';

insert into public.material_lots (
  id, site_id, project_id, group_id, location_id,
  position_precision, position_row, position_column, position_note,
  package_type, quantity, presence, condition, protection, accessibility,
  handling_requirements, parent_lot_id, root_lot_id, migration_note,
  created_at, updated_at, version
)
select
  allocation.new_lot_id,
  '00000000-0000-4000-8000-000000000002'::uuid,
  source.project_id,
  source.group_id,
  '00000000-0000-4000-8000-000000000111'::uuid,
  'Unknown', null, null, '',
  source.package_type,
  allocation.allocated_quantity,
  'Present',
  'Needs inspection',
  'Indoor',
  'Accessible',
  source.handling_requirements,
  source.id,
  source.root_lot_id,
  'Demo allocation placed in the Richardson indoor warehouse; quantity and physical presence require field confirmation.',
  '2026-08-18T19:00:00Z'::timestamptz,
  '2026-08-18T19:00:00Z'::timestamptz,
  1
from (
  values
    ('00000000-0000-4000-8000-000000900120'::uuid, '00000000-0000-4000-8000-000000020150'::uuid, 3),
    ('00000000-0000-4000-8000-000000900121'::uuid, '00000000-0000-4000-8000-000000020151'::uuid, 4),
    ('00000000-0000-4000-8000-000000900122'::uuid, '00000000-0000-4000-8000-000000020170'::uuid, 4),
    ('00000000-0000-4000-8000-000000900123'::uuid, '00000000-0000-4000-8000-000000020171'::uuid, 5)
) as allocation(new_lot_id, source_lot_id, allocated_quantity)
join public.material_lots source on source.id = allocation.source_lot_id;

update public.material_lots source
set
  quantity = source.quantity - allocation.allocated_quantity,
  updated_at = '2026-08-18T19:00:00Z'::timestamptz,
  version = source.version + 1,
  migration_note = concat_ws(' ', source.migration_note, 'A demonstration quantity was split into a Richardson indoor-warehouse lot.')
from (
  values
    ('00000000-0000-4000-8000-000000020150'::uuid, 3),
    ('00000000-0000-4000-8000-000000020151'::uuid, 4),
    ('00000000-0000-4000-8000-000000020170'::uuid, 4),
    ('00000000-0000-4000-8000-000000020171'::uuid, 5)
) as allocation(source_lot_id, allocated_quantity)
where source.id = allocation.source_lot_id
  and source.quantity >= allocation.allocated_quantity;

insert into public.activity_events (
  id, site_id, project_id, entity_type, entity_id, activity_type,
  description, occurred_at, operator_name, actor_user_id
)
values
  (
    '00000000-0000-4000-8000-000000900130',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000001015',
    'Project',
    '00000000-0000-4000-8000-000000001015',
    'Seeded',
    'Demo Ramer material allocation added to the Richardson indoor warehouse for multi-site validation.',
    '2026-08-18T19:00:00Z',
    'TBS test data',
    null
  ),
  (
    '00000000-0000-4000-8000-000000900131',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000001017',
    'Project',
    '00000000-0000-4000-8000-000000001017',
    'Seeded',
    'Demo Plano West material allocation added to the Richardson indoor warehouse for multi-site validation.',
    '2026-08-18T19:00:00Z',
    'TBS test data',
    null
  );
