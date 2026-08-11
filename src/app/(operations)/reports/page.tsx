import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <ModulePlaceholderPage
      eyebrow="Operations"
      title="Reports"
      description="Operational reporting, performance views, and future executive dashboards will be organized here."
      icon={BarChart3}
    />
  );
}
