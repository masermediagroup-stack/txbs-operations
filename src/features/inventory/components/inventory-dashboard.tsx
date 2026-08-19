"use client";

import { MapPin } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { ProjectFinder } from "@/features/inventory/components/project-finder";
import { BackupSheet } from "@/features/inventory/components/lot-actions";
import { useInventory } from "@/features/inventory/components/inventory-provider";

export function InventoryDashboard({ initialQuery = "" }: { initialQuery?: string }) {
  const { snapshot } = useInventory();
  const activeSites = snapshot.sites.filter((site) => site.active);
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Inventory"
        title="Find project materials"
        description="See what TBS has across Lavon and Richardson for every active project and its recorded storage location."
        action={<Badge variant="outline" className="gap-1.5 bg-card"><MapPin aria-hidden="true" data-icon="inline-start" />{activeSites.length} active sites</Badge>}
      />
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Demo environment — records and private photos may contain sample or test data and sync securely across signed-in devices.</p>
        <BackupSheet />
      </div>
      <ProjectFinder initialQuery={initialQuery} />
    </div>
  );
}
