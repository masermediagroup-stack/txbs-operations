// @vitest-environment node
import { expect, it } from "vitest"
import { readAllRows } from "@/lib/supabase/pagination"

it("loads over 10,000 records even when the server cap is below the requested page size", async () => {
  const records = Array.from({length:10_017},(_,id)=>({id}))
  const result = await readAllRows({range:async(from,to)=>({data:records.slice(from,Math.min(to+1,from+137)),error:null})})
  expect(result.data).toEqual(records)
})
it("rejects a failed later page instead of returning a silently incomplete snapshot",async () => {
  await expect(readAllRows({range:async(from)=>from === 0 ? {data:[{id:1}],error:null} : {data:null,error:{message:"connection failed"}}})).rejects.toThrow("complete dataset")
})
