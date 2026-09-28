// @vitest-environment node
import { beforeAll, afterAll, expect, it } from "vitest"
import { createTestDatabase } from "./helpers/database"
const operatorId = "10000000-0000-4000-8000-000000000001"
const techId = "10000000-0000-4000-8000-000000000002"
const otherTechId = "10000000-0000-4000-8000-000000000003"
const siteId = "00000000-0000-4000-8000-000000000001"
const projectId = "00000000-0000-4000-8000-000000001015"
const assignmentId = "10000000-0000-4000-8000-000000000004"
const uploadId = "10000000-0000-4000-8000-000000000005"
const commandId = "10000000-0000-4000-8000-000000000006"
const objectPath = siteId + "/" + operatorId + "/evidence.jpg"
let db: Awaited<ReturnType<typeof createTestDatabase>>
beforeAll(async () => {
  db = await createTestDatabase()
  for (const [id, role] of [[operatorId, "Operator"], [techId, "Tech"], [otherTechId, "Tech"]]) {
    await db.query("insert into auth.users(id,email) values ($1,$2)", [id,id+"@test.invalid"])
    await db.query("update public.profiles set active=true, system_role=$2::public.app_role where id=$1",[id,role])
  }
  await db.query("insert into public.site_memberships(site_id,user_id,role,active) values ($1,$2,'Manager',true)",[siteId,operatorId])
  await db.query("insert into public.field_assignments(id,site_id,project_id,assigned_tech_id,assigned_tech_name,assigned_by_user_id,assigned_by_name) values ($1,$2,$3,$4,'Tech',$5,'Operator')", [assignmentId,siteId,projectId,techId,operatorId])
  await db.query("insert into public.field_assignment_events(assignment_id,event_type,to_status,actor_user_id,actor_name) values ($1,'Assigned','Not Started',$2,'Operator')", [assignmentId,operatorId])
  await db.query("insert into public.staged_uploads(id,site_id,actor_user_id,command_id,object_path,content_type,size_bytes,checksum_sha256) values ($1,$2,$3,$4,$5,'image/jpeg',10,'verified-checksum')",[uploadId,siteId,operatorId,commandId,objectPath])
  await db.query("insert into storage.objects(bucket_id,name,owner_id) values ('operational-media',$1,$2)",[objectPath,operatorId])
}, 60000)
afterAll(async () => { await db?.close() })
it("applies the complete migration history to PostgreSQL", async () => {
  const result = await db.query("select relrowsecurity from pg_class where oid = 'public.field_assignments'::regclass")
  expect(result.rows[0]).toEqual({ relrowsecurity: true })
})

async function asUser<T>(id: string, work: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated")
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id])
    return work(tx)
  })
}

const authenticatedRpcSignatures = [
  "public.admin_configure_profile_v1(uuid,text,boolean,public.app_role,uuid)",
  "public.admin_list_receiving_notifications_v1()",
  "public.admin_upsert_receiving_notification_recipient_v1(uuid,text,text,boolean)",
  "public.execute_field_work_command_v1(uuid,text,uuid,jsonb)",
  "public.execute_inventory_command_v1(uuid,text,uuid,jsonb)",
  "public.get_field_work_snapshot_v1()",
]

const workerRpcSignatures = [
  "public.claim_receipt_notifications_v1(uuid)",
  "public.finish_receipt_notification_v1(uuid,text,text,text)",
]

it("allows only the assigned active Tech, and preserves intended Operator access", async () => {
  for (const [id, count] of [[operatorId,1],[techId,1],[otherTechId,0]] as const) {
    const records = await asUser(id, tx => tx.query("select id from public.field_assignments"))
    expect(records.rows).toHaveLength(count)
  }
  await db.query("update public.profiles set active=false where id=$1",[techId])
  try {
    expect((await asUser(techId, tx=>tx.query("select id from public.field_assignments"))).rows).toHaveLength(0)
    expect((await asUser(techId, tx=>tx.query("select id from public.field_assignment_events"))).rows).toHaveLength(0)
  } finally { await db.query("update public.profiles set active=true where id=$1",[techId]) }
})
it("denies anonymous table access and direct client evidence attestation", async () => {
  await expect(db.transaction(async tx => { await tx.exec("set local role anon"); await tx.query("select * from public.field_assignments") })).rejects.toMatchObject({code:"42501"})
  await expect(asUser(operatorId,tx=>tx.query("select public.verify_staged_upload($1,$2,$3,10)",[uploadId,operatorId,'verified-checksum']))).rejects.toMatchObject({code:"42501"})
  await expect(asUser(operatorId,tx=>tx.query("update public.staged_uploads set checksum_sha256='tampered' where id=$1",[uploadId]))).rejects.toMatchObject({code:"42501"})
})
it("reserves notification dispatch RPCs for the server worker", async () => {
  await expect(asUser(operatorId, tx => tx.query(
    "select public.claim_receipt_notifications_v1($1)",
    ["10000000-0000-4000-8000-000000000099"],
  ))).rejects.toMatchObject({ code: "42501" })
  await expect(asUser(operatorId, tx => tx.query(
    "select public.finish_receipt_notification_v1($1,'Failed',null,'fixture')",
    ["10000000-0000-4000-8000-000000000099"],
  ))).rejects.toMatchObject({ code: "42501" })

  await db.transaction(async tx => {
    await tx.exec("set local role service_role")
    await tx.query(
      "select public.finish_receipt_notification_v1($1,'Failed',null,'fixture')",
      ["10000000-0000-4000-8000-000000000099"],
    )
  })
})
it("exposes only intended RPCs and rejects inactive direct callers", async () => {
  for (const signature of [...authenticatedRpcSignatures, ...workerRpcSignatures]) {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('anon', $1, 'EXECUTE') as allowed",
      [signature],
    )
    expect(result.rows[0].allowed, signature).toBe(false)
  }
  for (const signature of authenticatedRpcSignatures) {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('authenticated', $1, 'EXECUTE') as allowed",
      [signature],
    )
    expect(result.rows[0].allowed, signature).toBe(true)
  }
  for (const signature of workerRpcSignatures) {
    const result = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('authenticated', $1, 'EXECUTE') as allowed",
      [signature],
    )
    expect(result.rows[0].allowed, signature).toBe(false)
  }

  await db.query("update public.profiles set active=false where id=$1", [operatorId])
  try {
    const calls = [
      ["select public.admin_configure_profile_v1($1,'Fixture',true,'Tech',$2)", [techId, siteId]],
      ["select public.admin_list_receiving_notifications_v1()", []],
      ["select public.admin_upsert_receiving_notification_recipient_v1(null,'Fixture','fixture@test.invalid',true)", []],
      ["select public.execute_field_work_command_v1($1,'fixture',$2,'{}'::jsonb)", [commandId, siteId]],
      ["select public.execute_inventory_command_v1($1,'fixture',$2,'{}'::jsonb)", [commandId, siteId]],
      ["select public.get_field_work_snapshot_v1()", []],
    ] as const
    for (const [sql, parameters] of calls) {
      await expect(asUser(operatorId, tx => tx.query(sql, [...parameters]))).rejects.toMatchObject({ code: "42501" })
    }
  } finally {
    await db.query("update public.profiles set active=true where id=$1", [operatorId])
  }
})
it("prevents an Operator, including the upload owner, from replacing or deleting evidence", async () => {
  expect((await asUser(operatorId,tx=>tx.query("update storage.objects set metadata='{}' where name=$1 returning id",[objectPath]))).rows).toHaveLength(0)
  expect((await asUser(operatorId,tx=>tx.query("delete from storage.objects where name=$1 returning id",[objectPath]))).rows).toHaveLength(0)
})
it("rejects unverified evidence, then accepts the verified command exactly once", async () => {
  const payload = { projectId, materialName:"Verified fixture", description:"", packageType:"Mixed",quantity:1,condition:"Needs inspection",protection:"Indoor",accessibility:"Accessible",handlingRequirements:[],locationId:null,precision:"Unknown",photoUpload:{id:uploadId,fileName:"evidence.jpg"} }
  const submit = () => asUser(operatorId,tx=>tx.query("select public.execute_inventory_command_v1($1,'material.add',$2,$3::jsonb) as result",[commandId,siteId,JSON.stringify(payload)]))
  await expect(submit()).rejects.toMatchObject({code:"23514"})
  await db.transaction(async tx=>{
    await tx.exec("set local role service_role")
    await tx.query("select public.verify_staged_upload($1,$2,$3,10)",[uploadId,operatorId,'verified-checksum'])
  })
  const first=await submit()
  expect(first.rows).toHaveLength(1)
  await submit()
  expect((await db.query("select id from public.photos where object_path=$1",[objectPath])).rows).toHaveLength(1)
})

it("requires privileged retention, retains an audit, and cannot falsely record deletion", async () => {
  const reason = "Approved isolated fixture retention verification"
  await expect(asUser(operatorId, tx => tx.query("select public.begin_evidence_retention($1,$2,$3)", [objectPath, operatorId, reason]))).rejects.toMatchObject({ code: "42501" })
  const result = await db.transaction(async tx => {
    await tx.exec("set local role service_role")
    return tx.query<{ id: string }>("select public.begin_evidence_retention($1,$2,$3) as id", [objectPath, operatorId, reason])
  })
  const requestId = result.rows[0].id
  await expect(db.transaction(async tx => {
    await tx.exec("set local role service_role")
    await tx.query("select public.finish_evidence_retention($1,'Deleted',null)", [requestId])
  })).rejects.toMatchObject({ code: "23514" })
  await db.transaction(async tx => {
    await tx.exec("set local role service_role")
    await tx.query("select public.finish_evidence_retention($1,'Failed','Fixture intentionally retained')", [requestId])
  })
  expect((await db.query("select outcome from private.evidence_retention_events where request_id=$1 order by outcome", [requestId])).rows).toEqual([{ outcome: "Failed" }, { outcome: "Requested" }])
  await expect(db.transaction(async tx => { await tx.exec("set local role service_role"); await tx.query("delete from private.evidence_retention_events") })).rejects.toMatchObject({ code: "42501" })
})
