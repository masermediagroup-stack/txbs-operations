import type { InventorySnapshot } from "./inventory"
import type { InventorySearchResult } from "@/features/inventory/types/inventory"

type SearchSnapshot = {
  projects: Pick<InventorySnapshot["projects"][number], "id" | "name" | "slug">[]
  groups: Pick<InventorySnapshot["groups"][number], "id" | "name">[]
  locations: Pick<InventorySnapshot["locations"][number], "id" | "name" | "slug">[]
}
export function inventorySearchRecords(snapshot: SearchSnapshot, query: string): InventorySearchResult[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return []
  const records: InventorySearchResult[] = [
    ...snapshot.projects.map((project) => ({id:project.id,type:"Project" as const,title:project.name,subtitle:"Project",href:`/inventory/projects/${project.slug}`,searchText:project.name.toLocaleLowerCase()})),
    ...[...new Map(snapshot.groups.map((group)=>[group.name,group])).values()].map((group)=>({id:group.id,type:"Material" as const,title:group.name,subtitle:"Material inventory",href:`/inventory/materials/${group.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}`,searchText:group.name.toLocaleLowerCase()})),
    ...snapshot.locations.map((location)=>({id:location.id,type:"Storage" as const,title:location.name,subtitle:"Storage location",href:`/inventory/storage/${location.slug}`,searchText:location.name.toLocaleLowerCase()})),
  ]
  return records.filter((record)=>record.searchText.includes(normalized)).slice(0,12)
}
