do $$
declare
  lavon_site_id uuid;
  fw_project_id uuid;
  conex_8_id uuid;
  primary_group_id uuid;
  primary_lot_id uuid;
  accessory_group_id uuid;
  accessory_lot_id uuid;
  corrected boolean := false;
begin
  select id into lavon_site_id
  from public.sites
  where slug = 'lavon-yard';

  if lavon_site_id is null then
    raise exception 'Lavon Yard is required before Conex 8 can be added.';
  end if;

  insert into public.storage_locations (
    site_id,
    slug,
    name,
    location_type,
    zone,
    notes,
    active
  )
  values (
    lavon_site_id,
    'conex-8',
    'Conex 8',
    'Conex',
    'Lavon Yard',
    'Keep project labels visible from the center aisle.',
    true
  )
  on conflict (site_id, slug) do update
  set name = excluded.name,
      location_type = excluded.location_type,
      zone = excluded.zone,
      notes = case
        when btrim(storage_locations.notes) = '' then excluded.notes
        else storage_locations.notes
      end,
      active = true
  returning id into conex_8_id;

  select id into fw_project_id
  from public.projects
  where site_id = lavon_site_id
    and slug = 'fw-maudrie-walton';

  -- A fresh database may not have imported demo inventory yet. In that case,
  -- the updated application seed creates the confirmed project lot later.
  if fw_project_id is null then
    return;
  end if;

  select group_record.id, lot_record.id
  into primary_group_id, primary_lot_id
  from public.material_groups group_record
  join public.material_lots lot_record on lot_record.group_id = group_record.id
  where group_record.project_id = fw_project_id
    and group_record.name = 'Architectural Specialties'
    and lot_record.version = 1
  order by lot_record.created_at
  limit 1;

  if primary_lot_id is not null then
    update public.material_groups
    set name = 'Marker Boards',
        description = '12-foot Marker Boards'
    where id = primary_group_id;

    update public.material_lots
    set location_id = conex_8_id,
        position_precision = 'Unknown',
        position_row = null,
        position_column = null,
        position_note = '',
        package_type = 'Loose',
        quantity = 8,
        migration_note = 'Confirmed inventory update: quantity 8, 12-foot Marker Boards, stored in Conex 8; exact position remains unverified.',
        updated_at = now(),
        version = version + 1
    where id = primary_lot_id;

    corrected := true;
  end if;

  if corrected then
    select group_record.id, lot_record.id
    into accessory_group_id, accessory_lot_id
    from public.material_groups group_record
    join public.material_lots lot_record on lot_record.group_id = group_record.id
    where group_record.project_id = fw_project_id
      and group_record.name = 'Project Accessories'
      and lot_record.version = 1
      and not exists (select 1 from public.photos where lot_id = lot_record.id)
      and not exists (select 1 from public.verification_records where lot_id = lot_record.id)
      and not exists (select 1 from public.issues where lot_id = lot_record.id)
      and not exists (select 1 from public.movement_lines where source_lot_id = lot_record.id or resulting_lot_id = lot_record.id)
      and not exists (select 1 from public.outbound_lines where source_lot_id = lot_record.id or resulting_lot_id = lot_record.id)
    order by lot_record.created_at
    limit 1;

    if accessory_lot_id is not null then
      delete from public.material_lots where id = accessory_lot_id;
      delete from public.material_groups where id = accessory_group_id;
    end if;

    update public.projects
    set updated_at = now(),
        version = version + 1
    where id = fw_project_id;

    if not exists (
      select 1
      from public.activity_events
      where project_id = fw_project_id
        and description = 'Inventory confirmed: 8 12-foot Marker Boards stored in Conex 8.'
    ) then
      insert into public.activity_events (
        site_id,
        project_id,
        entity_type,
        entity_id,
        activity_type,
        description,
        occurred_at,
        operator_name
      )
      values (
        lavon_site_id,
        fw_project_id,
        'Lot',
        primary_lot_id,
        'Material added',
        'Inventory confirmed: 8 12-foot Marker Boards stored in Conex 8.',
        now(),
        'Tyler Vea'
      );
    end if;
  end if;
end;
$$;
