import { inventoryProjects, storageLocations as legacyLocations } from "@/features/inventory/data/mock-data"
import { INVENTORY_SCHEMA_VERSION, unknownPosition, type InventorySnapshot } from "@/features/inventory/domain/inventory"

const LAVON_SITE_ID = "00000000-0000-4000-8000-000000000001"
const RICHARDSON_SITE_ID = "00000000-0000-4000-8000-000000000002"
const RICHARDSON_WAREHOUSE_ID = "00000000-0000-4000-8000-000000000111"
const RICHARDSON_RECEIVING_ID = "00000000-0000-4000-8000-000000000112"
const RICHARDSON_DEMO_ALLOCATIONS = [
  { id: "00000000-0000-4000-8000-000000900120", projectSlug: "ramer", groupIndex: 0, quantity: 3 },
  { id: "00000000-0000-4000-8000-000000900121", projectSlug: "ramer", groupIndex: 1, quantity: 4 },
  { id: "00000000-0000-4000-8000-000000900122", projectSlug: "plano-west", groupIndex: 0, quantity: 4 },
  { id: "00000000-0000-4000-8000-000000900123", projectSlug: "plano-west", groupIndex: 1, quantity: 5 },
] as const

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
  sites: [
    { id: LAVON_SITE_ID, slug: "lavon-yard", name: "Lavon Yard", active: true },
    { id: RICHARDSON_SITE_ID, slug: "richardson-office-warehouse", name: "Richardson Office & Warehouse", active: true },
  ],
  locations: [...legacyLocations.map((location) => ({
    id: locationIds.get(location.id)!,
    siteId: LAVON_SITE_ID,
    slug: location.slug,
    name: location.name,
    type: location.type,
    zone: location.zone,
    parentLocationId: null,
    notes: location.notes,
  })), {
    id: RICHARDSON_WAREHOUSE_ID,
    siteId: RICHARDSON_SITE_ID,
    slug: "richardson-indoor-warehouse",
    name: "Indoor Warehouse",
    type: "Office" as const,
    zone: "Richardson Main Office",
    parentLocationId: null,
    notes: "Small indoor warehouse area at the Richardson main office.",
  }, {
    id: RICHARDSON_RECEIVING_ID,
    siteId: RICHARDSON_SITE_ID,
    slug: "richardson-receiving",
    name: "Receiving Area",
    type: "Receiving" as const,
    zone: "Richardson Main Office",
    parentLocationId: null,
    notes: "Temporary receiving and inspection area before indoor storage assignment.",
  }],
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
  lots: [...inventoryProjects.flatMap((project, projectIndex) =>
    project.materialGroups.map((group, groupIndex) => {
      const allocatedQuantity = RICHARDSON_DEMO_ALLOCATIONS.find(
        (allocation) => allocation.projectSlug === project.slug && allocation.groupIndex === groupIndex,
      )?.quantity ?? 0
      const quantity = group.pallets + group.boxes - allocatedQuantity
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
    ...RICHARDSON_DEMO_ALLOCATIONS.map((allocation) => {
      const projectIndex = inventoryProjects.findIndex((project) => project.slug === allocation.projectSlug)
      const project = inventoryProjects[projectIndex]
      const sourceLotId = seedId(20_000 + projectIndex * 10 + allocation.groupIndex)
      return {
      id: allocation.id,
      projectId: projectIds.get(allocation.projectSlug)!,
      groupId: seedId(10_000 + projectIndex * 10 + allocation.groupIndex),
      siteId: RICHARDSON_SITE_ID,
      locationId: RICHARDSON_WAREHOUSE_ID,
      position: unknownPosition(),
      packageType: "Mixed" as const,
      quantity: allocation.quantity,
      presence: "Present" as const,
      condition: "Needs inspection" as const,
      protection: "Indoor" as const,
      accessibility: "Accessible" as const,
      handlingRequirements: [],
      parentLotId: sourceLotId,
      rootLotId: sourceLotId,
      createdAt: "2026-08-18T14:00:00.000Z",
      updatedAt: "2026-08-18T14:00:00.000Z",
      version: 1,
      migrationNote: `Demo allocation from ${project.name} placed in the Richardson indoor warehouse; quantity and physical presence require field confirmation.`,
    }}),
  ],
  photos: [],
  verifications: [],
  activities: [...inventoryProjects.flatMap((project, projectIndex) =>
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
  ), ...["ramer", "plano-west"].map((projectSlug, index) => ({
    id: `00000000-0000-4000-8000-00000090013${index}`,
    siteId: RICHARDSON_SITE_ID,
    projectId: projectIds.get(projectSlug)!,
    entityType: "Project" as const,
    entityId: projectIds.get(projectSlug)!,
    type: "Seeded" as const,
    description: "Demo material allocation added to the Richardson indoor warehouse for multi-site validation.",
    occurredAt: "2026-08-18T14:00:00.000Z",
    operatorName: "TBS test data",
  }))],
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

export { LAVON_SITE_ID, RICHARDSON_SITE_ID }
