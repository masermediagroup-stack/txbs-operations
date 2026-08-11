import { CheckCircle2 } from "lucide-react";

import { ModuleCard } from "@/components/shared/module-card";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { inventoryRoutes, primaryNavigation } from "@/config/navigation";

const receivingRoute = inventoryRoutes.find(
  (route) => route.href === "/inventory/receiving",
);

const operationsModules = primaryNavigation.flatMap((route) => {
  if (route.href === "/") return [];
  if (route.href === "/inventory" && receivingRoute) {
    return [route, receivingRoute];
  }
  return [route];
});

export function OverviewPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader
        eyebrow="Operations workspace"
        title="One clear view of TBS operations"
        description="A responsive foundation for coordinating material, projects, purchasing, deliveries, vendors, and reporting across the business."
        action={
          <Badge variant="outline" className="gap-1.5 bg-card">
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            Phase 0 foundation
          </Badge>
        }
      />

      <section className="space-y-4" aria-labelledby="module-map-heading">
        <SectionHeader
          id="module-map-heading"
          title="Operations modules"
          description="Every module has a stable route and a place in the shared application shell."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {operationsModules.map((route) => (
            <ModuleCard
              key={route.href}
              route={route}
              status={
                route.href === "/inventory" ||
                route.href === "/inventory/receiving"
                  ? "active"
                  : "planned"
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
