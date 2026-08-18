import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Boxes,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Shield,
  ClipboardCheck,
  ArrowRightLeft,
  PackageCheck,
  HardHat,
} from "lucide-react";

export type RouteDefinition = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  children?: RouteDefinition[];
};

export type BreadcrumbItem = Pick<RouteDefinition, "href" | "label">;

export const inventoryRoutes: RouteDefinition[] = [
  { label: "Dashboard", href: "/inventory", description: "Locate active project materials at the Lavon yard.", icon: LayoutDashboard },
  { label: "Receiving", href: "/inventory/receiving", description: "Identify, inspect, label, stage, and receive inbound material.", icon: ClipboardCheck },
  { label: "Movements", href: "/inventory/movements", description: "Move complete or partial material lots with durable source history.", icon: ArrowRightLeft },
  { label: "Outbound", href: "/inventory/outbound", description: "Prepare, confirm, and record project material leaving the yard.", icon: PackageCheck },
  { label: "Projects", href: "/inventory/projects", description: "Project workspaces, storage, and inventory history.", icon: FolderKanban },
  { label: "Materials", href: "/inventory/materials", description: "Material types and the projects that contain them.", icon: Boxes },
  { label: "Storage", href: "/inventory/storage", description: "Conex, outdoor, receiving, and office storage.", icon: Boxes },
  { label: "Activity", href: "/inventory/activity", description: "Inventory events across all active projects.", icon: Activity },
  { label: "Issues", href: "/inventory/issues", description: "Material exceptions that require attention.", icon: AlertCircle },
];

export const primaryNavigation: RouteDefinition[] = [
  { label: "Overview", href: "/", description: "Operations modules and workspace status.", icon: LayoutDashboard },
  { label: "Inventory", href: "/inventory", description: "Project material visibility and yard operations.", icon: Boxes, children: inventoryRoutes },
  { label: "Reports", href: "/reports", description: "Operational reporting and performance views.", icon: BarChart3 },
];

export const techNavigation: RouteDefinition[] = [
  { label: "Overview", href: "/", description: "Assigned field-work overview.", icon: LayoutDashboard },
  { label: "My Work", href: "/my-work", description: "Inventory, outbound material, and installation handoffs for field work.", icon: HardHat },
];

export const systemNavigation: RouteDefinition[] = [
  { label: "Administration", href: "/administration", description: "Organization-wide configuration and governance.", icon: Shield },
  { label: "Settings", href: "/settings", description: "Personal and workspace preferences.", icon: Settings },
];

const allRoutes = [...primaryNavigation.flatMap((route) => [route, ...(route.children ?? [])]), ...techNavigation, ...systemNavigation];

export function isRouteActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getRoute(pathname: string) {
  return allRoutes.find((route) => route.href === pathname);
}

function humanizeSegment(segment: string) {
  const acronyms = new Map([["isd", "ISD"], ["gisd", "GISD"], ["fisd", "FISD"], ["fwnw", "FWNW"], ["ph2", "PH2"]]);
  return segment.split("-").map((word) => acronyms.get(word) ?? `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/") return [{ label: "Overview", href: "/" }];

  if (pathname.startsWith("/inventory/")) {
    const segments = pathname.split("/").filter(Boolean);
    const sectionHref = `/inventory/${segments[1]}`;
    const section = getRoute(sectionHref);
    const items: BreadcrumbItem[] = [{ label: "Inventory", href: "/inventory" }];
    if (section) items.push({ label: section.label, href: section.href });
    if (segments[2]) items.push({ label: segments[1] === "issues" ? "Issue detail" : humanizeSegment(segments[2]), href: pathname });
    return items;
  }

  const current = getRoute(pathname);
  return [{ label: current?.label ?? "Overview", href: current?.href ?? "/" }];
}
