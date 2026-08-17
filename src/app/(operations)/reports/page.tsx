import type { Metadata } from "next";

import { getCurrentOperator } from "@/features/auth/server/session";
import { InventoryProvider } from "@/features/inventory/components/inventory-provider";
import { inventorySeed } from "@/features/inventory/data/seed-data";
import { ReportsWorkspace } from "@/features/reports/components/reports-workspace";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const operator = await getCurrentOperator();
  return (
    <InventoryProvider seed={inventorySeed} backend={operator ? "supabase" : "local"}>
      <ReportsWorkspace role={operator?.role ?? "Operator"} />
    </InventoryProvider>
  );
}
