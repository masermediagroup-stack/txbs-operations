import { inventorySeed } from "../src/features/inventory/data/seed-data"

function sql(value: string | null | undefined) {
  if (value === null || value === undefined) return "null"
  return `'${value.replaceAll("'", "''")}'`
}

function textArray(values: string[]) {
  return values.length ? `array[${values.map(sql).join(",")}]::text[]` : "'{}'::text[]"
}

const start = Number(process.argv[2] ?? 0)
const end = Number(process.argv[3] ?? inventorySeed.projects.length)
const projects = inventorySeed.projects.slice(start, end)
const projectIds = new Set(projects.map((project) => project.id))
const groups = inventorySeed.groups.filter((group) => projectIds.has(group.projectId))
const groupIds = new Set(groups.map((group) => group.id))
const lots = inventorySeed.lots.filter((lot) => groupIds.has(lot.groupId))
const activities = inventorySeed.activities.filter((activity) => activity.projectId && projectIds.has(activity.projectId))

const statements: string[] = ["begin;"]

for (const project of projects) {
  statements.push(`insert into public.projects (id,site_id,slug,name,job_number,status,created_at,updated_at,version) values (${sql(project.id)},${sql(project.siteId)},${sql(project.slug)},${sql(project.name)},${sql(project.jobNumber)},${sql(project.status)},${sql(project.createdAt)},${sql(project.updatedAt)},1) on conflict (id) do nothing;`)
  project.purchaseOrders.forEach((purchaseOrder) => statements.push(`insert into public.project_purchase_orders (project_id,purchase_order) values (${sql(project.id)},${sql(purchaseOrder)}) on conflict (project_id,purchase_order) do nothing;`))
  project.notes.forEach((note, index) => statements.push(`insert into public.project_notes (id,project_id,note,display_order) select gen_random_uuid(),${sql(project.id)},${sql(note)},${index} where not exists (select 1 from public.project_notes where project_id=${sql(project.id)} and note=${sql(note)} and display_order=${index});`))
}

for (const group of groups) {
  statements.push(`insert into public.material_groups (id,project_id,name,description) values (${sql(group.id)},${sql(group.projectId)},${sql(group.name)},${sql(group.description)}) on conflict (id) do nothing;`)
}

for (const lot of lots) {
  statements.push(`insert into public.material_lots (id,site_id,project_id,group_id,location_id,position_precision,position_row,position_column,position_note,package_type,quantity,presence,condition,protection,accessibility,handling_requirements,parent_lot_id,root_lot_id,migration_note,created_at,updated_at,version) values (${sql(lot.id)},${sql(lot.siteId)},${sql(lot.projectId)},${sql(lot.groupId)},${sql(lot.locationId)},${sql(lot.position.precision)},${sql(lot.position.row)},${sql(lot.position.column)},${sql(lot.position.note)},${sql(lot.packageType)},${lot.quantity ?? "null"},${sql(lot.presence)},${sql(lot.condition)},${sql(lot.protection)},${sql(lot.accessibility)},${textArray(lot.handlingRequirements)},${sql(lot.parentLotId)},${sql(lot.rootLotId)},${sql(lot.migrationNote)},${sql(lot.createdAt)},${sql(lot.updatedAt)},${lot.version}) on conflict (id) do nothing;`)
}

for (const activity of activities) {
  statements.push(`insert into public.activity_events (id,site_id,project_id,entity_type,entity_id,activity_type,description,occurred_at,operator_name,actor_user_id) values (${sql(activity.id)},${sql(activity.siteId)},${sql(activity.projectId)},${sql(activity.entityType)},${sql(activity.entityId)},${sql(activity.type)},${sql(activity.description)},${sql(activity.occurredAt)},${sql(activity.operatorName)},null) on conflict (id) do nothing;`)
}

statements.push("commit;")
process.stdout.write(statements.join("\n"))
