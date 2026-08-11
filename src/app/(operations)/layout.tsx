import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { OperationsShell } from "@/components/shell/operations-shell";
import { getCurrentOperator } from "@/features/auth/server/session";
import { hasSupabaseEnvironment, shouldBypassAuthentication } from "@/lib/supabase/env";

export default async function OperationsLayout({ children }: { children: ReactNode }) {
  const operator = await getCurrentOperator();

  if (hasSupabaseEnvironment() && !shouldBypassAuthentication() && !operator) redirect("/login");
  if (operator && !operator.active) redirect("/access-pending");

  return <OperationsShell operator={operator}>{children}</OperationsShell>;
}
