import { OverviewPage } from "@/features/overview/components/overview-page";
import { getCurrentOperator } from "@/features/auth/server/session";
import { InventoryProvider } from "@/features/inventory/components/inventory-provider";
import { inventorySeed } from "@/features/inventory/data/seed-data";

export default async function Page() {
  const operator = await getCurrentOperator();
  return <InventoryProvider seed={inventorySeed} backend={operator ? "supabase" : "local"}><OverviewPage role={operator?.role ?? "Operator"} /></InventoryProvider>;
}
