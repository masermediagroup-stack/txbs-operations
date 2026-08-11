import type { Metadata } from "next";
import { ActivityOverview } from "@/features/inventory/components/activity-overview";

export const metadata: Metadata = { title: "Inventory Activity" };
export default function Page() { return <ActivityOverview />; }
