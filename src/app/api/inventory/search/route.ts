import { NextResponse } from "next/server"
import { getCurrentOperator } from "@/features/auth/server/session"
import { createClient } from "@/lib/supabase/server"
import { inventorySearchRecords } from "@/features/inventory/domain/inventory-search"

export async function GET(request: Request) {
  const operator=await getCurrentOperator()
  if (!operator) return NextResponse.json({error:"Authentication is required."},{status:401})
  if (!operator.active) return NextResponse.json({error:"This account is not active."},{status:403})
  const query=new URL(request.url).searchParams.get("q")?.trim().slice(0,120) ?? ""
  if (!query) return NextResponse.json([],{headers:{"Cache-Control":"private, no-store"}})
  const pattern=`%${query.replace(/[\\%_]/g,"\\$&")}%`
  const client=await createClient()
  const [projects,groups,locations]=await Promise.all([
    client.from("projects").select("id,name,slug").ilike("name",pattern).order("name").order("id").limit(7),
    client.from("material_groups").select("id,name").ilike("name",pattern).order("name").order("id").limit(7),
    client.from("storage_locations").select("id,name,slug").ilike("name",pattern).order("name").order("id").limit(7),
  ])
  if (projects.error || groups.error || locations.error) return NextResponse.json({error:"Inventory search could not be loaded."},{status:500})
  const results=inventorySearchRecords({projects:projects.data,groups:groups.data,locations:locations.data},query)
  return NextResponse.json(results.slice(0,12),{headers:{"Cache-Control":"private, no-store"}})
}
