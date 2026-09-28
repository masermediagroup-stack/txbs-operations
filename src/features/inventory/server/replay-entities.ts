import "server-only"
import { createClient } from "@/lib/supabase/server"
import type { InventoryCommandType } from "@/features/inventory/domain/shared-command"
import type { ReplayEntities } from "@/features/mobile/domain/replay-identity"

export async function replayEntities(commandType: InventoryCommandType, entityId: string): Promise<ReplayEntities> {
  const supabase = await createClient()
  const entities: ReplayEntities = { primary: { entity: entityId } }
  if (commandType === "receipt.complete") {
    const { data, error } = await supabase.from("photos").select("receipt_line_id,lot_id,issue_id").eq("receipt_id", entityId)
    if (error) throw new Error("Could not reconcile received material identities.")
    entities.receiptLot = {}
    entities.receiptIssue = {}
    for (const photo of data ?? []) {
      if (photo.receipt_line_id && photo.lot_id) entities.receiptLot[photo.receipt_line_id] = photo.lot_id
      if (photo.receipt_line_id && photo.issue_id) entities.receiptIssue[photo.receipt_line_id] = photo.issue_id
    }
    const { data: unknown, error: issueError } = await supabase.from("issues").select("id").eq("receipt_id", entityId).eq("issue_type", "Unknown shipment").maybeSingle()
    if (issueError) throw new Error("Could not reconcile the receiving issue.")
    if (unknown) entities.receiptIssue.unknown = unknown.id
  }
  if (commandType === "movement.create") {
    const { data, error } = await supabase.from("movement_lines").select("source_lot_id,resulting_lot_id").eq("movement_id", entityId)
    if (error) throw new Error("Could not reconcile moved material identities.")
    entities.movementLot = Object.fromEntries((data ?? []).map((line) => [line.source_lot_id, line.resulting_lot_id]))
  }
  if (commandType === "outbound.depart") {
    const { data, error } = await supabase.from("outbound_lines").select("source_lot_id,resulting_lot_id").eq("batch_id", entityId)
    if (error) throw new Error("Could not reconcile outbound material identities.")
    entities.outboundLot = Object.fromEntries((data ?? []).filter((line) => line.resulting_lot_id).map((line) => [line.source_lot_id, line.resulting_lot_id!]))
  }
  return entities
}
