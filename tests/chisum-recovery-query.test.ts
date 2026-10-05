// @vitest-environment node
import { readFileSync } from "node:fs"
import { expect, it } from "vitest"
import { createTestDatabase } from "./helpers/database"

const siteId = "00000000-0000-4000-8000-000000000001"
const projectId = "20000000-0000-4000-8000-000000000001"
const lotId = "20000000-0000-4000-8000-000000000002"
const actorId = "20000000-0000-4000-8000-000000000003"
const commandId = "20000000-0000-4000-8000-000000000004"
const movementId = "20000000-0000-4000-8000-000000000005"
const uploadId = "20000000-0000-4000-8000-000000000006"
const objectPath = `${siteId}/${actorId}/${commandId}/${uploadId}-field.jpg`

type RecoveryRow = {
  chisum_project_count: number
  chisum_lots: Array<{ id: string; quantity: number; version: number }>
  command_receipts: number
  command_audit_records: number
  command_movements: number
  chisum_movements_since_field_test: number
  staged_uploads: number
  verified_uploads: number
  command_photos: number
  command_storage_objects: number
}

it("reports both a clean recovery baseline and every linked command residue", async () => {
  const db = await createTestDatabase()
  try {
    const sql = readFileSync("scripts/verify-chisum-recovery.sql", "utf8")
      .replaceAll("REPLACE_WITH_COMMAND_UUID", commandId)
    await db.query(
      "insert into public.projects(id,site_id,slug,name,status,created_at,updated_at) values($1,$2,'chisum-recovery-test','Chisum ISD','Stored',now(),now())",
      [projectId, siteId],
    )
    await db.exec(`with group_record as (
      insert into public.material_groups(project_id,name) values ('${projectId}','Recovery fixture') returning id
    ) insert into public.material_lots(
      id,site_id,project_id,group_id,root_lot_id,package_type,quantity,presence,
      condition,protection,accessibility,created_at,updated_at,version
    ) select '${lotId}','${siteId}','${projectId}',id,'${lotId}','Box',2,'Present',
      'Good','Indoor','Accessible',now(),now(),2 from group_record`)

    const clean = (await db.query<RecoveryRow>(sql)).rows[0]
    expect(clean.chisum_project_count).toBe(1)
    expect(clean.chisum_lots).toMatchObject([{ id: lotId, quantity: 2, version: 2 }])
    for (const key of [
      "command_receipts", "command_audit_records", "command_movements",
      "chisum_movements_since_field_test", "staged_uploads", "verified_uploads",
      "command_photos", "command_storage_objects",
    ] as const) expect(clean[key]).toBe(0)

    await db.query("insert into auth.users(id,email) values($1,'recovery@test.invalid')", [actorId])
    await db.query(
      "insert into public.command_receipts(command_id,command_type,command_version,site_id,actor_user_id,actor_name,entity_id) values($1,'movement.create',1,$2,$3,'Recovery Test',$4)",
      [commandId, siteId, actorId, movementId],
    )
    await db.query(
      "insert into public.audit_records(site_id,actor_name,action,entity_type,command_id) values($1,'Recovery Test','movement.create','Movement',$2)",
      [siteId, commandId],
    )
    await db.query(
      "insert into public.material_movements(id,site_id,movement_kind,reason,operator_name,occurred_at,client_mutation_id) values($1,$2,'Move','Recovery test','Recovery Test',now(),$3)",
      [movementId, siteId, commandId],
    )
    await db.query(
      `insert into public.movement_lines(
        movement_id,source_lot_id,resulting_lot_id,source_position_precision,
        destination_position_precision,resulting_lot_version
      ) values($1,$2,$2,'Unknown','Unknown',2)`,
      [movementId, lotId],
    )
    await db.query(
      "insert into public.staged_uploads(id,site_id,actor_user_id,command_id,object_path,content_type,size_bytes) values($1,$2,$3,$4,$5,'image/jpeg',4)",
      [uploadId, siteId, actorId, commandId, objectPath],
    )
    await db.query(
      "insert into private.verified_uploads(upload_id,checksum_sha256,size_bytes) values($1,'test-checksum',4)",
      [uploadId],
    )
    await db.query(
      "insert into public.photos(site_id,project_id,movement_id,photo_type,file_name,content_type,object_path,taken_at,uploaded_at,operator_name) values($1,$2,$3,'Material','field.jpg','image/jpeg',$4,now(),now(),'Recovery Test')",
      [siteId, projectId, movementId, objectPath],
    )
    await db.query(
      "insert into storage.objects(bucket_id,name) values('operational-media',$1)",
      [objectPath],
    )

    const residue = (await db.query<RecoveryRow>(sql)).rows[0]
    for (const key of [
      "command_receipts", "command_audit_records", "command_movements",
      "chisum_movements_since_field_test", "staged_uploads", "verified_uploads",
      "command_photos", "command_storage_objects",
    ] as const) expect(residue[key]).toBe(1)
  } finally {
    await db.close()
  }
}, 60_000)
