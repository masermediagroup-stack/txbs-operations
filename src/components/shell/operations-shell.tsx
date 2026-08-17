import type { ReactNode } from "react";

import { AppSidebar } from "@/components/shell/app-sidebar";
import { TopNavigation } from "@/components/shell/top-navigation";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import type { CurrentOperator } from "@/features/auth/server/session";
import { MobileSyncProvider } from "@/features/mobile/components/mobile-sync-provider";

export function OperationsShell({ children, operator }: { children: ReactNode; operator: CurrentOperator | null }) {
  return (
    <MobileSyncProvider operator={operator?.role === "Operator" ? operator : null}>
      <SidebarProvider>
        <AppSidebar operator={operator} />
        <SidebarInset id="main-content" tabIndex={-1}>
          <TopNavigation operator={operator} />
          <div className="flex min-w-0 flex-1 flex-col px-3 py-4 sm:px-4 lg:px-5 lg:py-5">
            <div className="mx-auto flex w-full max-w-[90rem] min-w-0 flex-1 flex-col">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </MobileSyncProvider>
  );
}
