import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/inventory",
  "/inventory/projects",
  "/inventory/projects/allen-isd",
  "/inventory/receiving",
  "/inventory/movements",
  "/inventory/outbound",
  "/inventory/materials",
  "/inventory/storage",
  "/inventory/storage/conex-3",
  "/inventory/storage/richardson-indoor-warehouse",
  "/inventory/storage/richardson-receiving",
  "/inventory/activity",
  "/inventory/issues",
  "/procurement",
  "/deliveries",
  "/vendors",
  "/reports",
  "/administration",
  "/settings",
];

test("all active operations routes render inside the shell", async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, includeHidden: true })).toHaveCount(1);
  }
});

test("mobile navigation exposes project material modules", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await expect(page.getByRole("link", { name: "Materials" })).toBeVisible();
  await page.getByRole("link", { name: "Materials" }).click();

  await expect(page).toHaveURL(/\/inventory\/materials$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Materials");
});

test("Inventory submenu expands and collapses vertically", async ({ page }) => {
  await page.goto("/inventory");

  if ((page.viewportSize()?.width ?? 0) < 768) {
    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  }

  const collapse = page.getByRole("button", { name: "Inventory", exact: true });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Materials", exact: true })).toBeVisible();

  await collapse.click();
  await expect(collapse).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("link", { name: "Materials", exact: true })).toBeHidden();

  await collapse.click();
  await expect(page.getByRole("link", { name: "Materials", exact: true })).toBeVisible();
});

test("Inventory project search filters instantly and opens a workspace", async ({ page }) => {
  await page.goto("/inventory");
  const search = page.getByRole("searchbox", {
    name: "Search inventory project materials",
  });
  await search.fill("Allen");
  await expect(page.getByText("2 projects with inventory records")).toBeVisible();
  await page.getByRole("link", { name: "Allen ISD", exact: true }).first().click();
  await expect(page).toHaveURL(/\/inventory\/projects\/allen-isd$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Allen ISD");
});

test("Overview has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What needs attention today" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Materials to verify/ }).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
