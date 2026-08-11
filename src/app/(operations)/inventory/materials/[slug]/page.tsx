import type { Metadata } from "next";
import { MaterialTypeWorkspace } from "@/features/inventory/components/material-type-workspace";
import {
  getMaterialType,
  getMaterialTypes,
} from "@/features/inventory/data/mock-data";

type MaterialTypePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getMaterialTypes().map((material) => ({ slug: material.slug }));
}

export async function generateMetadata({
  params,
}: MaterialTypePageProps): Promise<Metadata> {
  const material = getMaterialType((await params).slug);
  return { title: material?.name ?? "Material type" };
}

export default async function MaterialTypePage({
  params,
}: MaterialTypePageProps) {
  const { slug } = await params;
  return <MaterialTypeWorkspace slug={slug} />;
}
