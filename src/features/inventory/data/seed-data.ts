import { inventoryProjects, storageLocations as legacyLocations } from "@/features/inventory/data/mock-data"
import { INVENTORY_SCHEMA_VERSION, unknownPosition, type InventorySnapshot } from "@/features/inventory/domain/inventory"

const LAVON_SITE_ID = "00000000-0000-4000-8000-000000000001"

function seedId(value: number) {
  return `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`
}

const legacyLocationNumbers = new Map<string, number>([
  ...Array.from({ length: 7 }, (_, index) => [`conex-${index + 1}`, 100 + index] as const),
  ["north-yard", 107] as const,
  ["middle-yard", 108] as const,
  ["south-yard", 109] as const,
  ["conex-8", 110] as const,
])
const locationIds = new Map(legacyLocations.map((location) => [location.id, seedId(legacyLocationNumbers.get(location.id)!)]))
const projectIds = new Map(inventoryProjects.map((project, index) => [project.id, seedId(1_000 + index)]))

export const inventorySeed: InventorySnapshot = {
  schemaVersion: INVENTORY_SCHEMA_VERSION,
  revision: 0,
  sites: [{ id: LAVON_SITE_ID, slug: "lavon-yard", name: "Lavon Yard", active: true }],
  locations: legacyLocations.map((location) => ({
    id: locationIds.get(location.id)!,
    siteId: LAVON_SITE_ID,
    slug: location.slug,
    name: location.name,
    type: location.type,
    zone: location.zone,
    parentLocationId: null,
    notes: location.notes,
  })),
  projects: inventoryProjects.map((project, index) => ({
    id: seedId(1_000 + index),
    siteId: LAVON_SITE_ID,
    slug: project.slug,
    name: project.name,
    jobNumber: project.jobNumber,
    purchaseOrders: project.purchaseOrders,
    status: project.status,
    notes: project.notes,
    createdAt: project.activity.at(-1)?.occurredAt ?? project.lastActivity,
    updatedAt: project.lastActivity,
  })),
  aliases: [],
  groups: inventoryProjects.flatMap((project, projectIndex) =>
    project.materialGroups.map((group, groupIndex) => ({
      id: seedId(10_000 + projectIndex * 10 + groupIndex),
      projectId: projectIds.get(project.id)!,
      name: group.name,
      description: group.description,
    })),
  ),
  lots: inventoryProjects.flatMap((project, projectIndex) =>
    project.materialGroups.map((group, groupIndex) => {
      const quantity = group.pallets + group.boxes
      return {
        id: seedId(20_000 + projectIndex * 10 + groupIndex),
        projectId: projectIds.get(project.id)!,
        groupId: seedId(10_000 + projectIndex * 10 + groupIndex),
        siteId: LAVON_SITE_ID,
        locationId: locationIds.get(group.storageLocationId) ?? null,
        position: unknownPosition(),
        packageType: project.slug === "fw-maudrie-walton" ? "Loose" as const : "Mixed" as const,
        quantity,
        presence: "Present" as const,
        condition: "Needs inspection" as const,
        protection: "Unknown" as const,
        accessibility: "Unknown" as const,
        handlingRequirements: [],
        parentLotId: null,
        rootLotId: seedId(20_000 + projectIndex * 10 + groupIndex),
        createdAt: project.activity.at(-1)?.occurredAt ?? project.lastActivity,
        updatedAt: project.lastActivity,
        version: 1,
        migrationNote: project.slug === "fw-maudrie-walton"
          ? "Confirmed inventory update: quantity 8, 12-foot Marker Boards, stored in Conex 8; exact position remains unverified."
          : `Migrated from ${group.pallets} pallet${group.pallets === 1 ? "" : "s"} and ${group.boxes} box${group.boxes === 1 ? "" : "es"}; exact package breakdown remains in this note until field verification.`,
      }
    }),
  ),
  photos: [],
  verifications: [],
  activities: inventoryProjects.flatMap((project, projectIndex) =>
    project.activity.map((activity, activityIndex) => ({
      id: seedId(30_000 + projectIndex * 10 + activityIndex),
      siteId: LAVON_SITE_ID,
      projectId: projectIds.get(project.id)!,
      entityType: "Project" as const,
      entityId: projectIds.get(project.id)!,
      type: "Seeded" as const,
      description: activity.description,
      occurredAt: activity.occurredAt,
      operatorName: activity.actor,
    })),
  ),
  issues: [],
  issueComments: [],
  issueTransitions: [],
  receipts: [],
  receiptLines: [],
  movements: [],
  movementLines: [],
  outboundBatches: [],
  outboundLines: [],
}

export { LAVON_SITE_ID }
