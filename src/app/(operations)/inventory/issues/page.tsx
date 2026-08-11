import type { Metadata } from "next";
import { Suspense } from "react";
import { IssuesOverview } from "@/features/inventory/components/issues-overview";

export const metadata: Metadata = { title: "Inventory Issues" };
export default function Page() { return <Suspense fallback={null}><IssuesOverview /></Suspense>; }
