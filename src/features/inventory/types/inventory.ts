export const projectStatuses = [
  "Ordered",
  "Shipped",
  "Received",
  "Stored",
  "Ready for Delivery",
  "Delivered",
  "Installed",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const activityTypes = [
  "Received",
  "Moved",
  "Stored",
  "Photo Added",
  "Note Added",
  "Status Updated",
] as const;

export type ActivityType = (typeof activityTypes)[number];
export type StorageLocationType = "Conex" | "Outdoor" | "Office" | "Receiving";

export type ProjectMaterialGroup = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  storageLocationId: string;
  pallets: number;
  boxes: number;
};

export type MaterialTypeProject = {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  storageLocationIds: string[];
  pallets: number;
  boxes: number;
};

export type MaterialType = {
  slug: string;
  name: string;
  projects: MaterialTypeProject[];
  pallets: number;
  boxes: number;
};

export type InventoryActivity = {
  id: string;
  projectId: string;
  type: ActivityType;
  description: string;
  occurredAt: string;
  actor: string;
};

export type InventoryProject = {
  id: string;
  slug: string;
  name: string;
  jobNumber: string;
  purchaseOrders: string[];
  status: ProjectStatus;
  storageLocationIds: string[];
  materialGroups: ProjectMaterialGroup[];
  pallets: number;
  boxes: number;
  hasOutdoorMaterial: boolean;
  lastActivity: string;
  photoCount: number;
  notes: string[];
  activity: InventoryActivity[];
};

export type StorageLocation = {
  id: string;
  slug: string;
  name: string;
  type: StorageLocationType;
  zone: string;
  photoCount: number;
  notes: string;
};

export type InventorySearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "Project" | "Material" | "Storage";
  searchText: string;
};
