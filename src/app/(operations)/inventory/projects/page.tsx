import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { ProjectFinder } from "@/features/inventory/components/project-finder";

export const metadata: Metadata = { title: "Inventory Projects" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const query = (await searchParams).q;

  return <div className="flex flex-1 flex-col gap-6"><PageHeader eyebrow="Inventory" title="Projects" description="Every active project with material at the Lavon yard, organized for fast physical lookup." /><ProjectFinder heading="All inventory projects" initialQuery={typeof query === "string" ? query : ""} /></div>;
}
