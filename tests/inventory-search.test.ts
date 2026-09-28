// @vitest-environment node
import { expect,it } from "vitest"
import { inventorySearchRecords } from "@/features/inventory/domain/inventory-search"

it("searches current records, produces usable links and deduplicates material types",()=>{
  const records={projects:[{id:"new",name:"New project",slug:"new-project"}],groups:[{id:"one",name:"New material"},{id:"two",name:"New material"}],locations:[{id:"yard",name:"New yard",slug:"new-yard"}]}
  expect(inventorySearchRecords(records,"new").map(item=>item.href)).toEqual(["/inventory/projects/new-project","/inventory/materials/new-material","/inventory/storage/new-yard"])
  expect(inventorySearchRecords(records,"Allen")).toEqual([])
})
