import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";

import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export const metadata: Metadata = { title: "Procurement" };

export default function Page() {
  return (
    <ModulePlaceholderPage
      eyebrow="Operations"
      title="Procurement"
      description="Purchasing requests, orders, approvals, and material acquisition workflows will live here."
      icon={ShoppingCart}
    />
  );
}
