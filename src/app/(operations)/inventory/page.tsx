import type { Metadata } from "next";

import { InventoryDashboard } from "@/features/inventory/components/inventory-dashboard";

export const metadata: Metadata = {
  title: "Inventory",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const query = (await searchParams).q;

  return <InventoryDashboard initialQuery={typeof query === "string" ? query : ""} />;
}
