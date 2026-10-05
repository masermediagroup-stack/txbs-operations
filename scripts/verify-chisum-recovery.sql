-- A-08R: read-only check after exporting and discarding the original iPhone queue.
-- Replace REPLACE_WITH_COMMAND_UUID with clientMutationId for the Chisum
-- movement.create entry in the exported recovery journal. The placeholder
-- deliberately fails as a UUID until replaced. Run with privileged read access
-- in the temporary Supabase SQL Editor.
-- A zero count here is not proof that the device queue or archived photo is safe.
with input as (
  select 'REPLACE_WITH_COMMAND_UUID'::uuid as command_id
), chisum as (
  select id from public.projects where lower(name) = lower('Chisum ISD')
), chisum_lots as (
  select lot.id, lot.location_id, lot.quantity, lot.version, lot.presence
  from public.material_lots lot
  where lot.project_id in (select id from chisum)
), command_movements as (
  select movement.id
  from public.material_movements movement, input
  where movement.client_mutation_id = input.command_id
), staged as (
  select upload.id, upload.object_path
  from public.staged_uploads upload, input
  where upload.command_id = input.command_id
)
select
  (select count(*) from chisum) as chisum_project_count,
  (select coalesce(jsonb_agg(to_jsonb(lot) order by lot.id), '[]'::jsonb)
   from chisum_lots lot) as chisum_lots,
  (select count(*) from public.command_receipts receipt, input
   where receipt.command_id = input.command_id) as command_receipts,
  (select count(*) from public.audit_records audit, input
   where audit.command_id = input.command_id) as command_audit_records,
  (select count(*) from command_movements) as command_movements,
  (select count(distinct movement.id)
   from public.material_movements movement
   join public.movement_lines line on line.movement_id = movement.id
   join public.material_lots lot on lot.id in (line.source_lot_id, line.resulting_lot_id)
   where lot.project_id in (select id from chisum)
     and movement.occurred_at >= timestamptz '2026-09-23 13:00:00+00')
     as chisum_movements_since_field_test,
  (select count(*) from staged) as staged_uploads,
  (select count(*) from private.verified_uploads verified
   where verified.upload_id in (select id from staged)) as verified_uploads,
  (select count(*) from public.photos photo
   where photo.movement_id in (select id from command_movements)
      or photo.object_path in (select object_path from staged)
      or photo.object_path like '%/' || (select command_id::text from input) || '/%')
      as command_photos,
  (select count(*) from storage.objects object, input
   where object.bucket_id = 'operational-media'
     and object.name like '%/' || input.command_id::text || '/%') as command_storage_objects;
