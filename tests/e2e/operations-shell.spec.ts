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

test("desktop search reads newly stored records and supports keyboard navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/inventory");
  await expect(page.getByRole("searchbox", { name: "Search inventory project materials" })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => {
    if (!(await indexedDB.databases()).some((entry) => entry.name === "tbs-operations-v2:local")) return false;
    const request = indexedDB.open("tbs-operations-v2:local", 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    if (!database.objectStoreNames.contains("snapshot")) { database.close(); return false; }
    const read = database.transaction("snapshot", "readonly").objectStore("snapshot").get("current");
    const ready = await new Promise<boolean>((resolve, reject) => { read.onsuccess = () => resolve(Boolean(read.result)); read.onerror = () => reject(read.error); });
    database.close();
    return ready;
  })).toBe(true);
  await page.evaluate(async () => {
    const request = indexedDB.open("tbs-operations-v2:local", 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("snapshot", "readwrite");
      const store = tx.objectStore("snapshot");
      const read = store.get("current");
      read.onsuccess = () => {
        const snapshot = read.result;
        snapshot.projects.push({ ...snapshot.projects[0], id: crypto.randomUUID(), name: "Search fixture newly saved", slug: "search-fixture" });
        store.put(snapshot, "current");
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    database.close();
  });
  const search = page.getByRole("searchbox", { name: "Search inventory", exact: true });
  await search.fill("Search fixture newly saved");
  const result = page.getByRole("navigation", { name: "Inventory search results" }).getByRole("link", { name: /Search fixture newly saved/ });
  await expect(result).toHaveAttribute("href", "/inventory/projects/search-fixture");
  await search.press("ArrowDown");
  await expect(result).toBeFocused();
  await result.press("Escape");
  await expect(search).toBeFocused();
  await expect(result).toBeHidden();
});

test("public login removes obsolete private shell caches", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(async () => {
    const old = await caches.open("tbs-yard-v2-shell");
    await old.put("/offline", new Response("obsolete private fallback"));
    await caches.open("unrelated-application-cache");
  });
  const response = await page.reload();
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  await expect(page).toHaveURL(/\/login$/);
  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain("tbs-yard-v2-shell");
  expect(await page.evaluate(() => caches.keys())).toContain("unrelated-application-cache");
});

test("all active operations routes render inside the shell", async ({ page }) => {
  // Twenty dynamic page navigations share this budget; individual assertions remain bounded.
  test.setTimeout(60_000);
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
