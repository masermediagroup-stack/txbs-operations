import type { Metadata } from "next";
import { StorageOverview } from "@/features/inventory/components/storage-overview";

export const metadata: Metadata = { title: "Storage" };
export default function Page() { return <StorageOverview />; }
