"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
} from "lucide-react";

import { getBreadcrumbs } from "@/config/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { GlobalInventorySearch } from "@/features/inventory/components/global-inventory-search";
import { logoutAction } from "@/features/auth/server/actions";
import type { CurrentOperator } from "@/features/auth/server/session";
import { SyncStatusControl } from "@/features/mobile/components/sync-status-control";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function TopNavigation({ operator }: { operator: CurrentOperator | null }) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const displayName = operator?.displayName ?? "Tyler Vea";

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2.5 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-4 lg:px-5">
      <SidebarTrigger className="-ml-1 size-9" />

      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 text-sm"
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <span key={item.href} className="contents">
              {index > 0 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="hidden size-3.5 shrink-0 text-muted-foreground sm:block"
                />
              ) : null}
              {isLast ? (
                <span
                  aria-current="page"
                  className="truncate font-medium text-foreground"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hidden truncate text-muted-foreground hover:text-foreground sm:inline"
                >
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {operator?.role !== "Tech" ? <GlobalInventorySearch /> : null}
        {operator?.role !== "Tech" ? <SyncStatusControl /> : null}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Open notifications"
              />
            }
          >
            <Bell aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="px-3 py-5 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="h-10 gap-2 px-1.5 sm:px-2"
                aria-label="Open user menu"
              />
            }
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-brand-blue text-[10px] font-semibold text-white">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
              {displayName}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="hidden size-3.5 text-muted-foreground sm:block"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm text-foreground">{displayName}</span>
                <span className="block font-normal text-muted-foreground">
                  {operator ? `${operator.role} · ${operator.email}` : "Operations workspace"}
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/settings" />}>
                <Settings aria-hidden="true" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {operator ? (
              <>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem nativeButton render={<button type="submit" className="w-full" />}>
                    <LogOut aria-hidden="true" />
                    Sign out
                  </DropdownMenuItem>
                </form>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
