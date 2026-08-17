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

export function OverviewPage({ role = "Operator" }: { role?: "Operator" | "Tech" }) {
  const visibleModules = role === "Tech" ? [] : operationsModules;
  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader
        eyebrow="Operations workspace"
        title="One clear view of TBS operations"
        description={role === "Tech" ? "Your Tech account is ready. Assigned field installation and pickup workflows will appear here as those modules launch." : "A responsive foundation for coordinating material, projects, purchasing, deliveries, vendors, and reporting across the business."}
        action={
          <Badge variant="outline" className="gap-1.5 bg-card">
            <CheckCircle2 aria-hidden="true" data-icon="inline-start" />
            {role === "Tech" ? "Tech account" : "Phase 0 foundation"}
          </Badge>
        }
      />

      <section className="space-y-4" aria-labelledby="module-map-heading">
        <SectionHeader
          id="module-map-heading"
          title="Operations modules"
          description={role === "Tech" ? "Yard operations and account administration are available only to Operator accounts." : "Every module has a stable route and a place in the shared application shell."}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map((route) => (
            <ModuleCard
              key={route.href}
              route={route}
              status={
                route.href === "/inventory" ||
                route.href === "/inventory/receiving" ||
                route.href === "/reports"
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
