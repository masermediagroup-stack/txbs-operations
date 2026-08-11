import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectWorkspace } from "@/features/inventory/components/project-workspace";
import { getProject, inventoryProjects } from "@/features/inventory/data/mock-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return inventoryProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  return { title: project?.name ?? "Project not found" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return <ProjectWorkspace slug={slug} />;
}
