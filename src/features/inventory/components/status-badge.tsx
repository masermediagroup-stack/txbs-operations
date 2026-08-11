import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/features/inventory/types/inventory";
import { cn } from "@/lib/utils";

const statusStyles: Record<ProjectStatus, string> = {
  Ordered: "border-status-ordered/25 bg-status-ordered-soft text-status-ordered",
  Shipped: "border-status-shipped/25 bg-status-shipped-soft text-status-shipped",
  Received: "border-status-received/25 bg-status-received-soft text-status-received",
  Stored: "border-status-stored/25 bg-status-stored-soft text-status-stored",
  "Ready for Delivery": "border-status-ready/25 bg-status-ready-soft text-status-ready",
  Delivered: "border-status-delivered/25 bg-status-delivered-soft text-status-delivered",
  Installed: "border-status-installed/25 bg-status-installed-soft text-status-installed",
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(statusStyles[status], className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />
      {status}
    </Badge>
  );
}
