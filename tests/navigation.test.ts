import { describe, expect, it } from "vitest";

import {
  getBreadcrumbs,
  isRouteActive,
  primaryNavigation,
  systemNavigation,
  techNavigation,
  inventoryRoutes,
} from "../src/config/navigation";

describe("navigation configuration", () => {
  it("only repeats the Inventory dashboard path for its parent entry", () => {
    const routes = [
      ...primaryNavigation,
      ...systemNavigation,
      ...inventoryRoutes,
    ];
    const paths = routes.map((route) => route.href);

    const repeatedPaths = paths.filter(
      (path, index) => paths.indexOf(path) !== index,
    );

    expect(repeatedPaths).toEqual(["/inventory"]);
  });

  it("keeps project material workspaces under Inventory", () => {
    const inventory = primaryNavigation.find(
      (route) => route.href === "/inventory",
    );

    expect(inventory?.children?.map((route) => route.label)).toEqual(
      ["Dashboard", "Receiving", "Movements", "Outbound", "Projects", "Materials", "Storage", "Activity", "Issues"],
    );
  });

  it("gives Tech accounts one focused field-work entry point", () => {
    expect(techNavigation.map((route) => [route.label, route.href])).toEqual([
      ["Overview", "/"],
      ["My Work", "/my-work"],
    ]);
  });

  it("builds Inventory breadcrumbs for nested routes", () => {
    expect(getBreadcrumbs("/inventory/projects/allen-isd")).toEqual([
      { label: "Inventory", href: "/inventory" },
      { label: "Projects", href: "/inventory/projects" },
      { label: "Allen ISD", href: "/inventory/projects/allen-isd" },
    ]);
  });

  it("marks a parent route active for its descendants", () => {
    expect(isRouteActive("/inventory/projects/allen-isd", "/inventory/projects")).toBe(true);
    expect(isRouteActive("/projects", "/")).toBe(false);
  });
});
