"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";

import {
  primaryNavigation,
  techNavigation,
  systemNavigation,
  isRouteActive,
} from "@/config/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { CurrentOperator } from "@/features/auth/server/session";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

function BrandMark({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative shrink-0 overflow-hidden rounded-lg bg-white ${compact ? "size-8" : "size-10"} ${className}`}
    >
      <Image
        src="/images/brand/tbs-logo.png"
        alt=""
        width={436}
        height={317}
        aria-hidden="true"
        className="absolute max-w-none"
        style={{
          width: compact ? 88 : 104,
          height: "auto",
          maxWidth: "none",
          left: compact ? -27 : -30,
          top: -4,
        }}
        priority
      />
    </span>
  );
}

export function AppSidebar({ operator }: { operator: CurrentOperator | null }) {
  const pathname = usePathname();
  const [inventoryOpen, setInventoryOpen] = useState(() =>
    pathname.startsWith("/inventory"),
  );
  const { isMobile, setOpen, setOpenMobile, state } = useSidebar();
  const closeMobileNavigation = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  const visiblePrimaryNavigation = operator?.role === "Tech" ? techNavigation : primaryNavigation;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-3 pb-2 group-data-[collapsible=icon]:px-2">
        <Link
          href="/"
          onClick={closeMobileNavigation}
          aria-label="TBS Operations overview"
          className="flex min-h-10 items-start gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
        >
          <BrandMark className="group-data-[collapsible=icon]:hidden" />
          <BrandMark compact className="hidden group-data-[collapsible=icon]:block" />
          <span className="min-w-0 pt-0.5 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm leading-5 font-semibold text-sidebar-foreground">
              TBS Operations
            </span>
            <span className="block truncate text-xs leading-4 text-muted-foreground">
              Texas Building Specialties
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visiblePrimaryNavigation.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(pathname, item.href);

                if (item.children) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Collapsible
                        open={inventoryOpen}
                        onOpenChange={setInventoryOpen}
                      >
                        <CollapsibleTrigger
                          render={
                            <SidebarMenuButton
                              isActive={active}
                              tooltip={`${inventoryOpen ? "Collapse" : "Expand"} ${item.label}`}
                              onClick={() => {
                                if (!isMobile && state === "collapsed") {
                                  setOpen(true);
                                }
                              }}
                            />
                          }
                        >
                          <Icon aria-hidden="true" />
                          <span>{item.label}</span>
                          <ChevronRight
                            aria-hidden="true"
                            className={cn(
                              "ml-auto transition-transform group-data-[collapsible=icon]:hidden",
                              inventoryOpen && "rotate-90",
                            )}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children.map((child) => (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton
                                  render={
                                    <Link
                                      href={child.href}
                                      onClick={closeMobileNavigation}
                                    />
                                  }
                                  isActive={isRouteActive(pathname, child.href)}
                                >
                                  <span>{child.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={item.href}
                          onClick={closeMobileNavigation}
                        />
                      }
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>

                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavigation.filter((item) => operator?.role !== "Tech" || item.href === "/settings").map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={
                        <Link
                          href={item.href}
                          onClick={closeMobileNavigation}
                        />
                      }
                      isActive={isRouteActive(pathname, item.href)}
                      tooltip={item.label}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex min-h-10 items-center gap-3 rounded-lg bg-muted/70 px-2.5 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <MapPin
            aria-hidden="true"
            className="size-4 shrink-0 text-brand-orange"
          />
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-xs font-medium">{operator?.role === "Tech" ? "Field workspace" : "TBS Operations"}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {operator?.role === "Tech" ? "Inventory · outbound · install" : "Lavon · Richardson"}
            </span>
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
