import type { Metadata } from "next";
import { Shield } from "lucide-react";

import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export const metadata: Metadata = { title: "Administration" };

export default function Page() {
  return (
    <ModulePlaceholderPage
      eyebrow="Workspace"
      title="Administration"
      description="Organization configuration, governance, and future access-control workflows will be managed here."
      icon={Shield}
    />
  );
}
