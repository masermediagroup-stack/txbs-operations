import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorageWorkspace } from "@/features/inventory/components/storage-workspace";
import { getStorageLocation, storageLocations } from "@/features/inventory/data/mock-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return storageLocations.map((location) => ({ slug: location.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: getStorageLocation(slug)?.name ?? "Storage not found" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const location = getStorageLocation(slug);
  if (!location) notFound();
  return <StorageWorkspace slug={slug} />;
}
