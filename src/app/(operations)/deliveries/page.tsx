import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export const metadata: Metadata = { title: "Deliveries" };

export default function Page() {
  return (
    <ModulePlaceholderPage
      eyebrow="Operations"
      title="Deliveries"
      description="Future cross-operational delivery planning, schedules, carrier references, and field handoffs will be coordinated here."
      icon={CalendarDays}
    />
  );
}
