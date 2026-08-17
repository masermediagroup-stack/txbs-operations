import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";

import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";
import { getCurrentOperator } from "@/features/auth/server/session";

export const metadata: Metadata = { title: "Procurement" };

export default async function Page() {
  const operator = await getCurrentOperator();
  if (operator?.role === "Tech") redirect("/");
  return (
    <ModulePlaceholderPage
      eyebrow="Operations"
      title="Procurement"
      description="Purchasing requests, orders, approvals, and material acquisition workflows will live here."
      icon={ShoppingCart}
    />
  );
}
