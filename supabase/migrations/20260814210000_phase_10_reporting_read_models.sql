-- Phase 10 read models are additive and preserve source-record RLS.

create index if not exists material_lots_reporting_present_created_idx
  on public.material_lots (site_id, created_at desc)
  where presence = 'Present';

create index if not exists receipts_reporting_received_completed_idx
  on public.receipts (site_id, completed_at desc)
  where status = 'Received' and completed_at is not null;

create index if not exists issues_reporting_created_idx
  on public.issues (site_id, created_at desc);

create or replace view public.report_material_lots_v1
with (security_invoker = true)
as
select
  lot.id as lot_id,
  lot.site_id,
  lot.project_id,
  project.slug as project_slug,
  project.name as project_name,
  lot.group_id,
  material_group.name as material_name,
  lot.location_id,
  coalesce(location.name, 'Unknown / not assigned') as location_name,
  location.location_type,
  lot.package_type,
  lot.quantity,
  lot.presence,
  lot.condition,
  lot.protection,
  lot.accessibility,
  lot.created_at as recorded_at,
  lot.updated_at,
  latest_verification.verified_at as last_verified_at,
  coalesce(latest_verification.verified_at, lot.created_at) + interval '14 days' as verification_due_at,
  case
    when latest_verification.verified_at is null then 'Never verified'
    when latest_verification.verified_at + interval '14 days' <= now() then 'Overdue'
    else 'Verified'
  end as verification_state,
  'phase-10-v1'::text as formula_version
from public.material_lots lot
join public.projects project on project.id = lot.project_id
join public.material_groups material_group on material_group.id = lot.group_id
left join public.storage_locations location on location.id = lot.location_id
left join lateral (
  select verification.verified_at
  from public.verification_records verification
  where verification.lot_id = lot.id
  order by verification.verified_at desc
  limit 1
) latest_verification on true
where lot.presence = 'Present';

create or replace view public.report_receiving_v1
with (security_invoker = true)
as
select
  receipt.id as receipt_id,
  receipt.site_id,
  receipt.project_id,
  project.slug as project_slug,
  coalesce(project.name, nullif(receipt.handwritten_project_text, ''), 'Unresolved shipment') as project_name,
  nullif(receipt.receipt_number, '') as receipt_number,
  receipt.identity_state,
  receipt.inspection_state,
  receipt.completed_at,
  receipt.operator_name,
  count(line.id)::integer as line_count,
  coalesce(sum(line.quantity) filter (where line.quantity is not null), 0)::bigint as known_packages,
  count(line.id) filter (where line.quantity is null)::integer as unknown_quantity_lines,
  'phase-10-v1'::text as formula_version
from public.receipts receipt
left join public.projects project on project.id = receipt.project_id
left join public.receipt_lines line on line.receipt_id = receipt.id and line.active = true
where receipt.status = 'Received' and receipt.completed_at is not null
group by receipt.id, project.slug, project.name;

create or replace view public.report_issues_v1
with (security_invoker = true)
as
select
  issue.id as issue_id,
  issue.site_id,
  issue.project_id,
  project.slug as project_slug,
  coalesce(project.name, 'No project assigned') as project_name,
  issue.location_id,
  issue.issue_type,
  issue.priority,
  issue.status,
  issue.title,
  issue.blocking,
  issue.assignee_name,
  issue.created_at,
  issue.updated_at,
  issue.operator_name,
  'phase-10-v1'::text as formula_version
from public.issues issue
left join public.projects project on project.id = issue.project_id;

create or replace view public.report_outbound_v1
with (security_invoker = true)
as
select
  batch.id as batch_id,
  batch.site_id,
  batch.project_id,
  project.slug as project_slug,
  project.name as project_name,
  batch.state,
  batch.planned_at,
  batch.ready_at,
  batch.departed_at,
  batch.cancelled_at,
  batch.reversed_at,
  batch.operator_name,
  count(line.id)::integer as line_count,
  coalesce(sum(line.quantity) filter (where line.quantity is not null), 0)::bigint as known_packages,
  count(line.id) filter (where line.quantity is null)::integer as unknown_quantity_lines,
  'phase-10-v1'::text as formula_version
from public.outbound_batches batch
join public.projects project on project.id = batch.project_id
left join public.outbound_lines line on line.batch_id = batch.id
group by batch.id, project.slug, project.name;

create or replace view public.report_activity_v1
with (security_invoker = true)
as
select
  activity.id as event_id,
  activity.site_id,
  activity.project_id,
  project.slug as project_slug,
  coalesce(project.name, activity.entity_type) as project_name,
  activity.entity_type,
  activity.entity_id,
  activity.activity_type,
  activity.description,
  activity.occurred_at,
  activity.operator_name,
  'phase-10-v1'::text as formula_version
from public.activity_events activity
left join public.projects project on project.id = activity.project_id;

revoke all on public.report_material_lots_v1 from public, anon;
revoke all on public.report_receiving_v1 from public, anon;
revoke all on public.report_issues_v1 from public, anon;
revoke all on public.report_outbound_v1 from public, anon;
revoke all on public.report_activity_v1 from public, anon;

grant select on public.report_material_lots_v1 to authenticated;
grant select on public.report_receiving_v1 to authenticated;
grant select on public.report_issues_v1 to authenticated;
grant select on public.report_outbound_v1 to authenticated;
grant select on public.report_activity_v1 to authenticated;

comment on view public.report_material_lots_v1 is 'Phase 10 v1 permission-aware present-lot, verification, age, and exposure source model.';
comment on view public.report_receiving_v1 is 'Phase 10 v1 permission-aware completed Receiving source model.';
comment on view public.report_issues_v1 is 'Phase 10 v1 permission-aware Issue operations source model.';
comment on view public.report_outbound_v1 is 'Phase 10 v1 permission-aware Outbound history source model.';
comment on view public.report_activity_v1 is 'Phase 10 v1 permission-aware append-only operational Activity source model.';
