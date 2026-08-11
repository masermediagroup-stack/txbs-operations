import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { ModulePlaceholderPage } from "@/components/shared/module-placeholder-page";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <ModulePlaceholderPage
      eyebrow="Workspace"
      title="Settings"
      description="Personal preferences and workspace-level application settings will be configured here."
      icon={Settings}
    />
  );
}
