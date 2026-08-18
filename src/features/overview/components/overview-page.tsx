import { CheckCircle2 } from "lucide-react";

import { ModuleCard } from "@/components/shared/module-card";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Badge } from "@/components/ui/badge";
import { inventoryRoutes, primaryNavigation } from "@/config/navigation";
import { HardHat } from "lucide-react";

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
  const visibleModules = role === "Tech" ? [{ label: "My Work", href: "/my-work", description: "See inventory and outbound material for project-site work, with installation confirmation planned in the same workspace.", icon: HardHat }] : operationsModules;
  return (
    <div className="flex flex-1 flex-col gap-8">
      <PageHeader
        eyebrow="Operations workspace"
        title="One clear view of TBS operations"
        description={role === "Tech" ? "A focused field workspace for inventory visibility, outbound handoffs, and future installation confirmation." : "A complete operational workspace for trusted TBS staff across the office, leadership, material management, yards, and warehouses."}
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
          description={role === "Tech" ? "Tech access is focused on the material and handoff information needed at project sites; Procurement, costs, configuration, and account administration stay hidden." : "Operator is a broad business access scope—not a yard job title or rank."}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleModules.map((route) => (
            <ModuleCard
              key={route.href}
              route={route}
              status={
                route.href === "/inventory" ||
                route.href === "/inventory/receiving" ||
                route.href === "/reports" ||
                route.href === "/my-work"
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
