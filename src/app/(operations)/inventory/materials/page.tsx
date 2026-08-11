import type { Metadata } from "next";
import { MaterialsOverview } from "@/features/inventory/components/materials-overview";

export const metadata: Metadata = { title: "Materials" };
export default function Page() { return <MaterialsOverview />; }
