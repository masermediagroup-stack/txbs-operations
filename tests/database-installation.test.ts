// @vitest-environment node
import { afterAll, beforeAll, expect, it } from "vitest"
import { createTestDatabase } from "./helpers/database"

let db: Awaited<ReturnType<typeof createTestDatabase>>
const tech = crypto.randomUUID()
const operator = crypto.randomUUID()
beforeAll(async () => {
  db = await createTestDatabase()
  await db.exec(`with g as (insert into public.material_groups(project_id,name) select id,'Installation fixture' from public.projects limit 1 returning id,project_id), l as (select gen_random_uuid() as id,g.id as group_id,g.project_id,p.site_id from g join public.projects p on p.id=g.project_id)
    insert into public.material_lots(id,site_id,project_id,group_id,root_lot_id,package_type,quantity,presence,condition,protection,accessibility,created_at,updated_at)
    select id,site_id,project_id,group_id,id,'Box',100,'Present','Good','Indoor','Accessible',now(),now() from l`)
  for (const [id, role] of [[tech, "Tech"], [operator, "Operator"]]) {
    await db.query("insert into auth.users(id,email) values($1,$2)", [id, id+"@test.invalid"])
    await db.query("update public.profiles set active=true,system_role=$2::public.app_role where id=$1", [id, role])
  }
}, 60_000)
afterAll(async () => { await db?.close() })

async function fixture(quantity: number | null = 5, state = "Departed") {
  const { rows: [lot] } = await db.query<{id:string;site_id:string;project_id:string}>("select id,site_id,project_id from public.material_lots limit 1")
  const batch = crypto.randomUUID(), line = crypto.randomUUID(), assignment = crypto.randomUUID()
  await db.query("insert into public.outbound_batches(id,site_id,project_id,state,operator_name,planned_at,client_mutation_id) values($1,$2,$3,$4,'Fixture',now(),$5)", [batch,lot.site_id,lot.project_id,state,crypto.randomUUID()])
  await db.query("insert into public.outbound_lines(id,batch_id,source_lot_id,quantity,source_lot_version,source_position_precision,material_name,package_type) values($1,$2,$3,$4,1,'Unknown','Fixture','Box')",[line,batch,lot.id,quantity])
  await db.query("insert into public.field_assignments(id,site_id,project_id,outbound_batch_id,assigned_tech_id,assigned_tech_name,assigned_by_user_id,assigned_by_name) values($1,$2,$3,$4,$5,'Tech',$6,'Operator')",[assignment,lot.site_id,lot.project_id,batch,tech,operator])
  return { line, assignment, site: lot.site_id }
}
async function confirm(f: Awaited<ReturnType<typeof fixture>>, quantity: number, outcome = "Partially installed", version = 1, extra: Record<string,unknown> = {}, commandId = crypto.randomUUID()) {
  return db.transaction(async tx => {
    await tx.exec("set local role authenticated")
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[tech])
    return tx.query("select public.execute_field_work_command_v1($1,'field.installation.confirm',$2,$3::jsonb) as result",[commandId,f.site,JSON.stringify({assignmentId:f.assignment,expectedVersion:version,outcome,notes:"Fixture",lines:[{outboundLineId:f.line,installedQuantity:quantity}],photoUploads:[],issue:null,...extra})])
  })
}
it("records repeated partial installations cumulatively and completes exactly once",async () => {
  const f=await fixture()
  await confirm(f,2)
  expect((await db.query("select remaining_quantity from public.installation_lines where outbound_line_id=$1",[f.line])).rows).toEqual([{remaining_quantity:3}])
  await expect(confirm(f,4,"Installed",2)).rejects.toMatchObject({code:"23514"})
  await expect(confirm(f,1,"Installed",2)).rejects.toMatchObject({code:"23514"})
  const commandId=crypto.randomUUID()
  await confirm(f,3,"Installed",2,{},commandId)
  await confirm(f,3,"Installed",2,{},commandId)
  expect((await db.query("select sum(installed_quantity)::integer as total,count(*)::integer as count from public.installation_lines where outbound_line_id=$1",[f.line])).rows).toEqual([{total:5,count:2}])
  expect((await db.query("select status from public.field_assignments where id=$1",[f.assignment])).rows).toEqual([{status:"Completed"}])
})
it("rejects confirmation before departure, duplicates, missing lines and missing versions",async () => {
  await expect(confirm(await fixture(5,"Ready"),1)).rejects.toMatchObject({code:"23514"})
  const f=await fixture()
  await expect(confirm(f,0,"Partially installed",1,{lines:[]})).rejects.toMatchObject({code:"23514"})
  await expect(confirm(f,0,"Partially installed",1,{lines:[{outboundLineId:f.line,installedQuantity:0},{outboundLineId:f.line,installedQuantity:0}]})).rejects.toMatchObject({code:"23514"})
  await expect(confirm(f,0,"Partially installed",1,{expectedVersion:null})).rejects.toMatchObject({code:"40001"})
})
it("requires an issue for Blocked and explicit acknowledgment for unknown quantities",async () => {
  const f=await fixture()
  await expect(confirm(f,0,"Blocked")).rejects.toMatchObject({code:"23514"})
  await confirm(f,0,"Blocked",1,{issue:{type:"Blocked access",priority:"High",title:"Access blocked",description:"Fixture"}})
  expect((await db.query("select remaining_quantity from public.installation_lines where outbound_line_id=$1",[f.line])).rows).toEqual([{remaining_quantity:5}])
  const unknown=await fixture(null)
  await expect(confirm(unknown,0,"Installed")).rejects.toMatchObject({code:"23514"})
  await confirm(unknown,0,"Installed",1,{unknownQuantityConfirmed:true})
  expect((await db.query("select unknown_quantity_confirmed from public.installation_confirmations where assignment_id=$1",[unknown.assignment])).rows).toEqual([{unknown_quantity_confirmed:true}])
})
