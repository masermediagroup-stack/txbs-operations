import type { LucideIcon } from "lucide-react";
import { Clock3 } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type ModulePlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function ModulePlaceholderPage({
  eyebrow,
  title,
  description,
  icon: Icon,
}: ModulePlaceholderPageProps) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <Badge variant="outline" className="gap-1.5 bg-card">
            <Clock3 aria-hidden="true" data-icon="inline-start" />
            Planned
          </Badge>
        }
      />

      <Card className="min-h-80 flex-1">
        <CardContent className="flex flex-1">
          <Empty className="min-h-64 border border-dashed bg-muted/25">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Icon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{title} is planned</EmptyTitle>
              <EmptyDescription>
                This destination is reserved for a later product phase and is not
                part of the current demonstration workflow.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
