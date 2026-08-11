import type {
  MaterialType,
  ProjectMaterialGroup,
  ProjectStatus,
  StorageLocation,
  InventoryActivity,
  InventoryProject,
  InventorySearchResult,
} from "@/features/inventory/types/inventory";

export const storageLocations: StorageLocation[] = [
  ...Array.from({ length: 7 }, (_, index) => ({
    id: `conex-${index + 1}`,
    slug: `conex-${index + 1}`,
    name: `Conex ${index + 1}`,
    type: "Conex" as const,
    zone: "Lavon Yard",
    photoCount: [6, 3, 8, 5, 4, 7, 2, 4][index],
    notes: "Keep project labels visible from the center aisle.",
  })),
  {
    id: "north-yard",
    slug: "north-yard",
    name: "North Yard",
    type: "Outdoor",
    zone: "North Yard",
    photoCount: 9,
    notes: "Open storage area along the north side of the Lavon Yard.",
  },
  {
    id: "middle-yard",
    slug: "middle-yard",
    name: "Middle Yard",
    type: "Outdoor",
    zone: "Middle Yard",
    photoCount: 5,
    notes: "Central open storage and staging area within the Lavon Yard.",
  },
  {
    id: "south-yard",
    slug: "south-yard",
    name: "South Yard",
    type: "Outdoor",
    zone: "South Yard",
    photoCount: 4,
    notes: "Open storage area along the south side of the Lavon Yard.",
  },
];

type ProjectSeed = {
  name: string;
  slug: string;
  jobNumber: string;
  status: ProjectStatus;
  locations: string[];
  pallets: number;
  boxes: number;
  lastActivity: string;
  materials?: [string, string];
};

const projectSeeds: ProjectSeed[] = [
  { name: "FW Maudrie Walton", slug: "fw-maudrie-walton", jobNumber: "TBS-24118", status: "Stored", locations: ["conex-1", "south-yard"], pallets: 4, boxes: 12, lastActivity: "2026-08-04T14:20:00-05:00" },
  { name: "Allen ISD", slug: "allen-isd", jobNumber: "TBS-24126", status: "Ready for Delivery", locations: ["conex-4", "south-yard"], pallets: 2, boxes: 5, lastActivity: "2026-08-05T09:12:00-05:00", materials: ["Marker Boards", "Bathroom Accessories"] },
  { name: "Allen Police", slug: "allen-police", jobNumber: "TBS-24131", status: "Received", locations: ["middle-yard", "conex-2"], pallets: 3, boxes: 9, lastActivity: "2026-08-05T08:40:00-05:00", materials: ["Detention Accessories", "Fire Extinguisher Cabinets"] },
  { name: "Pearce ISD", slug: "pearce-isd", jobNumber: "TBS-24097", status: "Stored", locations: ["conex-3"], pallets: 5, boxes: 18, lastActivity: "2026-08-03T15:05:00-05:00", materials: ["Visual Display Boards", "Toilet Partitions"] },
  { name: "FWNW Patrol", slug: "fwnw-patrol", jobNumber: "TBS-24104", status: "Shipped", locations: ["middle-yard"], pallets: 2, boxes: 7, lastActivity: "2026-08-02T11:30:00-05:00", materials: ["Lockers", "Corner Guards"] },
  { name: "Douglas ISD", slug: "douglas-isd", jobNumber: "TBS-24082", status: "Stored", locations: ["conex-5", "middle-yard"], pallets: 3, boxes: 14, lastActivity: "2026-08-01T10:15:00-05:00", materials: ["Marker Boards", "Room Signage"] },
  { name: "Bush ISD", slug: "bush-isd", jobNumber: "TBS-24115", status: "Received", locations: ["conex-6", "middle-yard"], pallets: 6, boxes: 11, lastActivity: "2026-08-04T16:42:00-05:00", materials: ["Toilet Accessories", "Operable Wall Parts"] },
  { name: "Richardson City Hall", slug: "richardson-city-hall", jobNumber: "TBS-24076", status: "Ready for Delivery", locations: ["conex-2", "middle-yard"], pallets: 1, boxes: 16, lastActivity: "2026-08-05T07:55:00-05:00", materials: ["Directories", "Fire Protection Cabinets"] },
  { name: "Chisum ISD", slug: "chisum-isd", jobNumber: "TBS-24133", status: "Ordered", locations: ["middle-yard"], pallets: 0, boxes: 4, lastActivity: "2026-07-31T13:25:00-05:00", materials: ["Gymnasium Equipment", "Marker Boards"] },
  { name: "Hilton Anatole PH2", slug: "hilton-anatole-ph2", jobNumber: "TBS-24069", status: "Stored", locations: ["conex-7", "north-yard"], pallets: 7, boxes: 22, lastActivity: "2026-08-03T12:10:00-05:00", materials: ["Wall Protection", "Hotel Accessories"] },
  { name: "Denton ISD", slug: "denton-isd", jobNumber: "TBS-24121", status: "Stored", locations: ["conex-1", "conex-7"], pallets: 8, boxes: 13, lastActivity: "2026-08-04T09:48:00-05:00", materials: ["Athletic Lockers", "Visual Display Boards"] },
  { name: "Naaman Forest GISD", slug: "naaman-forest-gisd", jobNumber: "TBS-24091", status: "Received", locations: ["conex-3", "south-yard"], pallets: 4, boxes: 8, lastActivity: "2026-08-02T14:55:00-05:00", materials: ["Toilet Partitions", "Marker Boards"] },
  { name: "Coppell ISD", slug: "coppell-isd", jobNumber: "TBS-24109", status: "Ready for Delivery", locations: ["conex-5"], pallets: 3, boxes: 15, lastActivity: "2026-08-05T08:02:00-05:00", materials: ["Projection Screens", "Bathroom Accessories"] },
  { name: "New Boston", slug: "new-boston", jobNumber: "TBS-24088", status: "Shipped", locations: ["middle-yard"], pallets: 1, boxes: 6, lastActivity: "2026-08-01T15:36:00-05:00", materials: ["Access Panels", "Fire Extinguishers"] },
  { name: "Lakeview FISD", slug: "lakeview-fisd", jobNumber: "TBS-24128", status: "Stored", locations: ["conex-6", "north-yard"], pallets: 5, boxes: 10, lastActivity: "2026-08-03T09:20:00-05:00", materials: ["Bleachers Components", "Lockers"] },
  { name: "Ramer", slug: "ramer", jobNumber: "TBS-24102", status: "Received", locations: ["conex-7", "middle-yard"], pallets: 2, boxes: 19, lastActivity: "2026-08-04T11:14:00-05:00", materials: ["Cubicle Curtains", "Room Signage"] },
  { name: "Sherman Stadium ISD", slug: "sherman-stadium-isd", jobNumber: "TBS-24073", status: "Stored", locations: ["south-yard", "conex-7"], pallets: 9, boxes: 7, lastActivity: "2026-08-02T08:35:00-05:00", materials: ["Stadium Lockers", "Athletic Equipment"] },
  { name: "Plano West", slug: "plano-west", jobNumber: "TBS-24124", status: "Ready for Delivery", locations: ["conex-4", "north-yard"], pallets: 6, boxes: 17, lastActivity: "2026-08-05T10:04:00-05:00", materials: ["Marker Boards", "Wall Protection"] },
];

function materialGroupsFor(seed: ProjectSeed): ProjectMaterialGroup[] {
  const names = seed.materials ?? ["Architectural Specialties", "Project Accessories"];
  const primaryPallets = Math.ceil(seed.pallets * 0.6);
  const primaryBoxes = Math.ceil(seed.boxes * 0.35);
  return names.map((name, groupIndex) => ({
    id: `${seed.slug}-material-${groupIndex + 1}`,
    projectId: seed.slug,
    name,
    description: groupIndex === 0 ? "Primary packaged material group" : "Accessory and finish material group",
    storageLocationId: seed.locations[groupIndex % seed.locations.length],
    pallets: groupIndex === 0 ? primaryPallets : Math.max(0, seed.pallets - primaryPallets),
    boxes: groupIndex === 0 ? primaryBoxes : Math.max(0, seed.boxes - primaryBoxes),
  }));
}

function activityFor(seed: ProjectSeed, index: number): InventoryActivity[] {
  const projectId = seed.slug;
  return [
    { id: `${projectId}-activity-1`, projectId, type: seed.status === "Ready for Delivery" ? "Status Updated" : "Stored", description: seed.status === "Ready for Delivery" ? "Project marked ready for field delivery." : `Materials confirmed in ${storageName(seed.locations[0])}.`, occurredAt: seed.lastActivity, actor: index % 2 === 0 ? "Marcus Reed" : "Elena Torres" },
    { id: `${projectId}-activity-2`, projectId, type: "Photo Added", description: "Storage condition photos added to the project record.", occurredAt: `2026-07-${String(24 + (index % 7)).padStart(2, "0")}T13:30:00-05:00`, actor: "Inventory Team" },
    { id: `${projectId}-activity-3`, projectId, type: "Received", description: `Shipment received under PO-${4620 + index}.`, occurredAt: `2026-07-${String(16 + (index % 8)).padStart(2, "0")}T09:15:00-05:00`, actor: "Receiving Team" },
  ];
}

export const inventoryProjects: InventoryProject[] = projectSeeds.map((seed, index) => ({
  id: seed.slug,
  slug: seed.slug,
  name: seed.name,
  jobNumber: seed.jobNumber,
  purchaseOrders: [`PO-${4620 + index}`, `PO-${5100 + index}`],
  status: seed.status,
  storageLocationIds: seed.locations,
  materialGroups: materialGroupsFor(seed),
  pallets: seed.pallets,
  boxes: seed.boxes,
  hasOutdoorMaterial: seed.locations.some((id) => id.includes("outdoor") || id.includes("yard")),
  lastActivity: seed.lastActivity,
  photoCount: 3 + (index % 7),
  notes: [
    "Keep project labels facing the access aisle.",
    index % 3 === 0 ? "Confirm final quantities before delivery release." : "No active inventory exceptions.",
  ],
  activity: activityFor(seed, index),
}));

export function storageName(id: string) {
  return storageLocations.find((location) => location.id === id)?.name ?? id;
}

export function getProject(slug: string) {
  return inventoryProjects.find((project) => project.slug === slug);
}

export function getStorageLocation(slug: string) {
  return storageLocations.find((location) => location.slug === slug);
}

export function getProjectsAtLocation(locationId: string) {
  return inventoryProjects.filter((project) => project.storageLocationIds.includes(locationId));
}

export function getAllMaterialGroups() {
  return inventoryProjects.flatMap((project) =>
    project.materialGroups.map((group) => ({ ...group, projectName: project.name })),
  );
}

export function materialTypeSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getMaterialTypes(): MaterialType[] {
  const names = new Set(
    inventoryProjects.flatMap((project) =>
      project.materialGroups.map((group) => group.name),
    ),
  );

  return [...names]
    .map((name) => {
      const projects = inventoryProjects.flatMap((project) => {
        const groups = project.materialGroups.filter(
          (group) => group.name === name,
        );

        if (groups.length === 0) return [];

        return [
          {
            projectId: project.slug,
            projectName: project.name,
            status: project.status,
            storageLocationIds: [
              ...new Set(groups.map((group) => group.storageLocationId)),
            ],
            pallets: groups.reduce((total, group) => total + group.pallets, 0),
            boxes: groups.reduce((total, group) => total + group.boxes, 0),
          },
        ];
      });

      return {
        slug: materialTypeSlug(name),
        name,
        projects,
        pallets: projects.reduce((total, project) => total + project.pallets, 0),
        boxes: projects.reduce((total, project) => total + project.boxes, 0),
      };
    })
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

export function getMaterialType(slug: string) {
  return getMaterialTypes().find((material) => material.slug === slug);
}

export function getAllActivity() {
  return inventoryProjects
    .flatMap((project) => project.activity.map((activity) => ({ ...activity, projectName: project.name })))
    .toSorted((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

export const inventorySearchResults: InventorySearchResult[] = [
  ...inventoryProjects.map((project) => ({
    id: project.id,
    title: project.name,
    subtitle: `${project.jobNumber} · ${project.purchaseOrders.join(", ")}`,
    href: `/inventory/projects/${project.slug}`,
    type: "Project" as const,
    searchText: [project.name, project.jobNumber, ...project.purchaseOrders, ...project.materialGroups.map((group) => group.name), ...project.storageLocationIds.map(storageName)].join(" ").toLowerCase(),
  })),
  ...getMaterialTypes().map((material) => ({
    id: material.slug,
    title: material.name,
    subtitle: `${material.projects.length} ${material.projects.length === 1 ? "project" : "projects"}`,
    href: `/inventory/materials/${material.slug}`,
    type: "Material" as const,
    searchText: `${material.name} ${material.projects.map((project) => project.projectName).join(" ")}`.toLowerCase(),
  })),
  ...storageLocations.map((location) => ({
    id: location.id,
    title: location.name,
    subtitle: `${location.type} · ${location.zone}`,
    href: `/inventory/storage/${location.slug}`,
    type: "Storage" as const,
    searchText: `${location.name} ${location.type} ${location.zone}`.toLowerCase(),
  })),
];
