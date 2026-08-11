import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export const metadata: Metadata = { title: "Vendors" };

export default function Page() {
  return (
    <ModulePlaceholderPage
      eyebrow="Operations"
      title="Vendors"
      description="Vendor records, contacts, sourcing relationships, and performance context will be managed here."
      icon={Building2}
    />
  );
}
