import { MapPin } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { ProjectFinder } from "@/features/inventory/components/project-finder";
import { BackupSheet } from "@/features/inventory/components/lot-actions";

export function InventoryDashboard({ initialQuery = "" }: { initialQuery?: string }) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow="Inventory"
        title="Find project materials"
        description="See what the Lavon yard has for every active project and its exact storage location."
        action={<Badge variant="outline" className="gap-1.5 bg-card"><MapPin aria-hidden="true" data-icon="inline-start" />Lavon Yard</Badge>}
      />
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">Inventory records and photos are stored on this device until shared infrastructure launches.</p>
        <BackupSheet />
      </div>
      <ProjectFinder initialQuery={initialQuery} />
    </div>
  );
}
