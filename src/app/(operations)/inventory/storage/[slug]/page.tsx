import type { Metadata } from "next";

import { StorageWorkspace } from "@/features/inventory/components/storage-workspace";
import { inventorySeed } from "@/features/inventory/data/seed-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return inventorySeed.locations.map((location) => ({ slug: location.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: inventorySeed.locations.find((location) => location.slug === slug)?.name ?? "Storage location" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <StorageWorkspace slug={slug} />;
}
