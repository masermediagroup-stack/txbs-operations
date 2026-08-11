import type { Metadata } from "next";
import { ReceivingWorkspace } from "@/features/inventory/components/receiving-workspace";

export const metadata: Metadata = { title: "Receiving" };

export default function Page() {
  return <ReceivingWorkspace />;
}
