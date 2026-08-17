import { OverviewPage } from "@/features/overview/components/overview-page";
import { getCurrentOperator } from "@/features/auth/server/session";

export default async function Page() {
  const operator = await getCurrentOperator();
  return <OverviewPage role={operator?.role ?? "Operator"} />;
}
