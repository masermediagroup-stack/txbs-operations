import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  INVENTORY_SCHEMA_VERSION,
  inventorySnapshotSchema,
  type InventorySnapshot,
  type StoragePosition,
} from "@/features/inventory/domain/inventory"
import type { Database } from "@/lib/supabase/database.types"

type QueryResult<T> = { data: T[] | null; error: { message: string } | null }

function rows<T>(result: QueryResult<T>, table: string): T[] {
  if (result.error) throw new Error(`Could not load ${table}: ${result.error.message}`)
  return result.data ?? []
}

function position(
  precision: string,
  row: string | null,
  column: string | null,
  note: string,
): StoragePosition {
  return {
    precision: precision as StoragePosition["precision"],
    row: row as StoragePosition["row"],
    column: column as StoragePosition["column"],
    note,
  }
}

function idsBy<T>(items: T[], predicate: (item: T) => boolean, id: (item: T) => string) {
  return items.filter(predicate).map(id)
}

export async function loadSupabaseInventorySnapshot(
  supabase: SupabaseClient<Database>,
): Promise<InventorySnapshot> {
  const [
    siteResult,
    locationResult,
    projectResult,
    aliasResult,
    purchaseOrderResult,
    projectNoteResult,
    groupResult,
    lotResult,
    receiptResult,
    receiptLineResult,
    movementResult,
    movementLineResult,
    outboundBatchResult,
    outboundLineResult,
    issueResult,
    issueCommentResult,
    issueTransitionResult,
    photoResult,
    verificationResult,
    verificationPhotoResult,
    activityResult,
    commandResult,
  ] = await Promise.all([
    supabase.from("sites").select("*").order("name"),
    supabase.from("storage_locations").select("*").order("name"),
    supabase.from("projects").select("*").order("updated_at", { ascending: false }),
    supabase.from("project_aliases").select("*").order("value"),
    supabase.from("project_purchase_orders").select("*").order("purchase_order"),
    supabase.from("project_notes").select("*").order("display_order"),
    supabase.from("material_groups").select("*").order("name"),
    supabase.from("material_lots").select("*").order("updated_at", { ascending: false }),
    supabase.from("receipts").select("*").order("updated_at", { ascending: false }),
    supabase.from("receipt_lines").select("*").eq("active", true),
    supabase.from("material_movements").select("*").order("occurred_at", { ascending: false }),
    supabase.from("movement_lines").select("*"),
    supabase.from("outbound_batches").select("*").order("planned_at", { ascending: false }),
    supabase.from("outbound_lines").select("*"),
    supabase.from("issues").select("*").order("updated_at", { ascending: false }),
    supabase.from("issue_comments").select("*").order("created_at"),
    supabase.from("issue_transitions").select("*").order("occurred_at"),
    supabase.from("photos").select("*").order("uploaded_at"),
    supabase.from("verification_records").select("*").order("verified_at"),
    supabase.from("verification_photos").select("*"),
    supabase.from("activity_events").select("*").order("occurred_at", { ascending: false }),
    supabase.from("command_receipts").select("command_id,created_at"),
  ])

  const sites = rows(siteResult, "sites")
  const locations = rows(locationResult, "storage locations")
  const projects = rows(projectResult, "projects")
  const aliases = rows(aliasResult, "project aliases")
  const purchaseOrders = rows(purchaseOrderResult, "project purchase orders")
  const projectNotes = rows(projectNoteResult, "project notes")
  const groups = rows(groupResult, "material groups")
  const lots = rows(lotResult, "material lots")
  const receipts = rows(receiptResult, "receipts")
  const receiptLines = rows(receiptLineResult, "receipt lines")
  const movements = rows(movementResult, "material movements")
  const movementLines = rows(movementLineResult, "movement lines")
  const outboundBatches = rows(outboundBatchResult, "outbound batches")
  const outboundLines = rows(outboundLineResult, "outbound lines")
  const issues = rows(issueResult, "issues")
  const issueComments = rows(issueCommentResult, "issue comments")
  const issueTransitions = rows(issueTransitionResult, "issue transitions")
  const photos = rows(photoResult, "photos")
  const verifications = rows(verificationResult, "verification records")
  const verificationPhotos = rows(verificationPhotoResult, "verification photos")
  const activities = rows(activityResult, "activity events")
  const commands = rows(commandResult, "command receipts")

  const snapshot: InventorySnapshot = {
    schemaVersion: INVENTORY_SCHEMA_VERSION,
    revision:
      commands.length +
      projects.reduce((total, project) => total + project.version, 0) +
      lots.reduce((total, lot) => total + lot.version, 0) +
      receipts.reduce((total, receipt) => total + receipt.version, 0) +
      outboundBatches.reduce((total, batch) => total + batch.version, 0) +
      issues.reduce((total, issue) => total + issue.version, 0),
    sites: sites.map((site) => ({
      id: site.id,
      slug: site.slug,
      name: site.name,
      active: site.active,
    })),
    locations: locations.map((location) => ({
      id: location.id,
      siteId: location.site_id,
      slug: location.slug,
      name: location.name,
      type: location.location_type as InventorySnapshot["locations"][number]["type"],
      zone: location.zone,
      parentLocationId: location.parent_location_id,
      notes: location.notes,
    })),
    projects: projects.map((project) => ({
      id: project.id,
      siteId: project.site_id,
      slug: project.slug,
      name: project.name,
      jobNumber: project.job_number,
      purchaseOrders: purchaseOrders
        .filter((item) => item.project_id === project.id)
        .map((item) => item.purchase_order),
      status: project.status as InventorySnapshot["projects"][number]["status"],
      notes: projectNotes
        .filter((item) => item.project_id === project.id)
        .map((item) => item.note),
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      version: project.version,
    })),
    aliases: aliases.map((alias) => ({
      id: alias.id,
      projectId: alias.project_id,
      type: alias.alias_type as InventorySnapshot["aliases"][number]["type"],
      value: alias.value,
    })),
    groups: groups.map((group) => ({
      id: group.id,
      projectId: group.project_id,
      name: group.name,
      description: group.description,
    })),
    lots: lots.map((lot) => ({
      id: lot.id,
      projectId: lot.project_id,
      groupId: lot.group_id,
      siteId: lot.site_id,
      locationId: lot.location_id,
      position: position(lot.position_precision, lot.position_row, lot.position_column, lot.position_note),
      packageType: lot.package_type as InventorySnapshot["lots"][number]["packageType"],
      quantity: lot.quantity,
      presence: lot.presence as InventorySnapshot["lots"][number]["presence"],
      condition: lot.condition as InventorySnapshot["lots"][number]["condition"],
      protection: lot.protection as InventorySnapshot["lots"][number]["protection"],
      accessibility: lot.accessibility as InventorySnapshot["lots"][number]["accessibility"],
      handlingRequirements: lot.handling_requirements,
      parentLotId: lot.parent_lot_id,
      rootLotId: lot.root_lot_id,
      createdAt: lot.created_at,
      updatedAt: lot.updated_at,
      version: lot.version,
      ...(lot.migration_note ? { migrationNote: lot.migration_note } : {}),
    })),
    photos: photos.map((photo) => ({
      id: photo.id,
      siteId: photo.site_id,
      projectId: photo.project_id,
      lotId: photo.lot_id,
      receiptId: photo.receipt_id,
      movementId: photo.movement_id,
      outboundBatchId: photo.outbound_batch_id,
      issueId: photo.issue_id,
      locationId: photo.location_id,
      type: photo.photo_type as InventorySnapshot["photos"][number]["type"],
      caption: photo.caption,
      fileName: photo.file_name,
      contentType: photo.content_type,
      blobKey: photo.object_path,
      takenAt: photo.taken_at,
      uploadedAt: photo.uploaded_at,
      operatorName: photo.operator_name,
    })),
    verifications: verifications.map((verification) => ({
      id: verification.id,
      lotId: verification.lot_id,
      verifiedAt: verification.verified_at,
      operatorName: verification.operator_name,
      locationId: verification.location_id,
      position: position(
        verification.position_precision,
        verification.position_row,
        verification.position_column,
        verification.position_note,
      ),
      note: verification.note,
      photoIds: idsBy(
        verificationPhotos,
        (item) => item.verification_id === verification.id,
        (item) => item.photo_id,
      ),
    })),
    activities: activities.map((activity) => ({
      id: activity.id,
      siteId: activity.site_id,
      projectId: activity.project_id,
      entityType: activity.entity_type as InventorySnapshot["activities"][number]["entityType"],
      entityId: activity.entity_id,
      type: activity.activity_type as InventorySnapshot["activities"][number]["type"],
      description: activity.description,
      occurredAt: activity.occurred_at,
      operatorName: activity.operator_name,
    })),
    issues: issues.map((issue) => ({
      id: issue.id,
      siteId: issue.site_id,
      projectId: issue.project_id,
      lotId: issue.lot_id,
      receiptId: issue.receipt_id,
      locationId: issue.location_id,
      movementId: issue.movement_id,
      outboundBatchId: issue.outbound_batch_id,
      type: issue.issue_type as InventorySnapshot["issues"][number]["type"],
      priority: issue.priority as InventorySnapshot["issues"][number]["priority"],
      status: issue.status as InventorySnapshot["issues"][number]["status"],
      title: issue.title,
      description: issue.description,
      blocking: issue.blocking,
      assigneeName: issue.assignee_name,
      photoIds: idsBy(photos, (photo) => photo.issue_id === issue.id, (photo) => photo.id),
      resolutionNote: issue.resolution_note,
      idempotencyKey: issue.idempotency_key,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      operatorName: issue.operator_name,
    })),
    issueComments: issueComments.map((comment) => ({
      id: comment.id,
      issueId: comment.issue_id,
      body: comment.body,
      photoIds: idsBy(photos, (photo) => photo.issue_comment_id === comment.id, (photo) => photo.id),
      createdAt: comment.created_at,
      operatorName: comment.operator_name,
      userId: comment.actor_user_id,
    })),
    issueTransitions: issueTransitions.map((transition) => ({
      id: transition.id,
      issueId: transition.issue_id,
      kind: transition.transition_kind as InventorySnapshot["issueTransitions"][number]["kind"],
      fromStatus: transition.from_status as InventorySnapshot["issueTransitions"][number]["fromStatus"],
      toStatus: transition.to_status as InventorySnapshot["issueTransitions"][number]["toStatus"],
      note: transition.note,
      occurredAt: transition.occurred_at,
      operatorName: transition.operator_name,
      userId: transition.actor_user_id,
    })),
    receipts: receipts.map((receipt) => ({
      id: receipt.id,
      siteId: receipt.site_id,
      receiptNumber: receipt.receipt_number,
      projectId: receipt.project_id,
      identityState: receipt.identity_state as InventorySnapshot["receipts"][number]["identityState"],
      inspectionState: receipt.inspection_state as InventorySnapshot["receipts"][number]["inspectionState"],
      status: receipt.status as InventorySnapshot["receipts"][number]["status"],
      handwrittenProjectText: receipt.handwritten_project_text,
      physicalLabelApplied: receipt.physical_label_applied,
      labelPhotoId:
        photos.find((photo) => photo.receipt_id === receipt.id && photo.photo_type === "Label")?.id ?? null,
      documentPhotoIds: idsBy(
        photos,
        (photo) =>
          photo.receipt_id === receipt.id &&
          photo.receipt_line_id === null &&
          photo.photo_type === "Document",
        (photo) => photo.id,
      ),
      lineIds: receiptLines.filter((line) => line.receipt_id === receipt.id).map((line) => line.id),
      stagingLocationId: receipt.staging_location_id,
      notes: receipt.notes,
      createdAt: receipt.created_at,
      updatedAt: receipt.updated_at,
      completedAt: receipt.completed_at,
      operatorName: receipt.operator_name,
    })),
    receiptLines: receiptLines.map((line) => ({
      id: line.id,
      receiptId: line.receipt_id,
      materialName: line.material_name,
      description: line.description,
      packageType: line.package_type as InventorySnapshot["receiptLines"][number]["packageType"],
      quantity: line.quantity,
      condition: line.condition as InventorySnapshot["receiptLines"][number]["condition"],
      protection: line.protection as InventorySnapshot["receiptLines"][number]["protection"],
      accessibility: line.accessibility as InventorySnapshot["receiptLines"][number]["accessibility"],
      handlingRequirements: line.handling_requirements,
      targetLocationId: line.target_location_id,
      photoIds: idsBy(photos, (photo) => photo.receipt_line_id === line.id, (photo) => photo.id),
    })),
    movements: movements.map((movement) => ({
      id: movement.id,
      siteId: movement.site_id,
      kind: movement.movement_kind as InventorySnapshot["movements"][number]["kind"],
      reason: movement.reason,
      note: movement.note,
      operatorName: movement.operator_name,
      occurredAt: movement.occurred_at,
      photoId: photos.find((photo) => photo.movement_id === movement.id)?.id ?? null,
      clientMutationId: movement.client_mutation_id,
      reversalOfMovementId: movement.reversal_of_movement_id,
    })),
    movementLines: movementLines.map((line) => ({
      id: line.id,
      movementId: line.movement_id,
      sourceLotId: line.source_lot_id,
      resultingLotId: line.resulting_lot_id,
      sourceLocationId: line.source_location_id,
      sourcePosition: position(
        line.source_position_precision,
        line.source_position_row,
        line.source_position_column,
        line.source_position_note,
      ),
      destinationLocationId: line.destination_location_id,
      destinationPosition: position(
        line.destination_position_precision,
        line.destination_position_row,
        line.destination_position_column,
        line.destination_position_note,
      ),
      quantity: line.quantity,
      resultingLotVersion: line.resulting_lot_version,
    })),
    outboundBatches: outboundBatches.map((batch) => ({
      id: batch.id,
      siteId: batch.site_id,
      projectId: batch.project_id,
      state: batch.state as InventorySnapshot["outboundBatches"][number]["state"],
      operatorName: batch.operator_name,
      carrierReference: batch.carrier_reference,
      driverReference: batch.driver_reference,
      note: batch.note,
      plannedAt: batch.planned_at,
      readyAt: batch.ready_at,
      departedAt: batch.departed_at,
      cancelledAt: batch.cancelled_at,
      reversedAt: batch.reversed_at,
      photoIds: idsBy(photos, (photo) => photo.outbound_batch_id === batch.id, (photo) => photo.id),
      clientMutationId: batch.client_mutation_id,
      processedMutationIds: [batch.client_mutation_id],
      reversalOfBatchId: batch.reversal_of_batch_id,
    })),
    outboundLines: outboundLines.map((line) => ({
      id: line.id,
      batchId: line.batch_id,
      sourceLotId: line.source_lot_id,
      resultingLotId: line.resulting_lot_id,
      quantity: line.quantity,
      sourceLotVersion: line.source_lot_version,
      sourceLocationId: line.source_location_id,
      sourcePosition: position(
        line.source_position_precision,
        line.source_position_row,
        line.source_position_column,
        line.source_position_note,
      ),
      materialName: line.material_name,
      packageType: line.package_type as InventorySnapshot["outboundLines"][number]["packageType"],
      handlingRequirements: line.handling_requirements,
      resultingLotVersion: line.resulting_lot_version,
    })),
  }

  return inventorySnapshotSchema.parse(snapshot)
}
