import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { RouteDefinition } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ModuleCardProps = {
  route: RouteDefinition;
  status?: "active" | "planned";
  compact?: boolean;
};

export function ModuleCard({
  route,
  status = "planned",
  compact = false,
}: ModuleCardProps) {
  const Icon = route.icon;

  return (
    <Link
      href={route.href}
      className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <Card
        size={compact ? "sm" : "default"}
        className={cn(
          "h-full transition-[box-shadow,transform,background-color] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md",
          status === "active" && "ring-primary/25",
        )}
      >
        <CardHeader>
          <div
            className={cn(
              "mb-3 flex size-9 items-center justify-center rounded-lg",
              status === "active"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground group-hover:text-primary",
            )}
          >
            <Icon aria-hidden="true" className="size-4.5" />
          </div>
          <CardTitle>{route.label}</CardTitle>
          <CardDescription className="text-pretty leading-5">
            {route.description}
          </CardDescription>
          <CardAction className="flex items-center gap-2">
            {status === "active" ? (
              <Badge variant="secondary" className="text-primary">
                Active
              </Badge>
            ) : null}
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
            />
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
