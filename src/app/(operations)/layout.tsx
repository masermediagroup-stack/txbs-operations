import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { OperationsShell } from "@/components/shell/operations-shell";
import { PublicCacheCleanup } from "@/features/auth/components/public-cache-cleanup";
import { getCurrentOperator } from "@/features/auth/server/session";
import { hasSupabaseEnvironment, shouldBypassAuthentication } from "@/lib/supabase/env";

// Account-specific pages and per-request CSP nonces must never be prerendered.
export const dynamic = "force-dynamic";

export default async function OperationsLayout({ children }: { children: ReactNode }) {
  const operator = await getCurrentOperator();

  if (hasSupabaseEnvironment() && !shouldBypassAuthentication() && !operator) redirect("/login");
  if (operator && !operator.active) redirect("/access-pending");

  return <OperationsShell operator={operator}><PublicCacheCleanup />{children}</OperationsShell>;
}
