import Link from "next/link";
import { Camera, CheckCircle2, ClipboardPlus, MapPin, MessageSquareText, MoveRight } from "lucide-react";

import type { ActivityType, InventoryActivity } from "@/features/inventory/types/inventory";

const activityIcons: Record<ActivityType, typeof CheckCircle2> = {
  Received: ClipboardPlus,
  Moved: MoveRight,
  Stored: MapPin,
  "Photo Added": Camera,
  "Note Added": MessageSquareText,
  "Status Updated": CheckCircle2,
};

export function ActivityTimeline({ activities, showProjectName = false }: { activities: Array<InventoryActivity & { projectName?: string }>; showProjectName?: boolean }) {
  return (
    <ol className="space-y-0">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type];
        return (
          <li key={activity.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < activities.length - 1 ? <span aria-hidden="true" className="absolute top-8 bottom-0 left-4 w-px bg-border" /> : null}
            <span className="relative z-1 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-primary"><Icon aria-hidden="true" className="size-3.5" /></span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium">{activity.type}</span>
                {showProjectName && activity.projectName ? (
                  <Link
                    href={`/inventory/projects/${activity.projectId}`}
                    className="-mx-1 rounded-md px-1 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {activity.projectName}
                  </Link>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{activity.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(activity.occurredAt))} · {activity.actor}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
