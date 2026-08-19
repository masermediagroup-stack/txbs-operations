import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("reports provide filters, worklists, drill-through, and CSV at the current viewport", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeAttached();
  await expect(page.getByText("Operations intelligence")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Verification" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Verification worklist")).toBeVisible();

  await page.getByRole("tab", { name: "Age & exposure" }).click();
  await expect(page.getByText("Material age and exposure")).toBeVisible();
  await expect(page.getByRole("button", { name: /Export \d+ rows/ })).toBeEnabled();

  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    for (const category of ["Age & exposure", "Verification", "Storage", "Readiness", "Activity"]) {
      await page.getByRole("tab", { name: category }).click();
      const table = page.getByRole("table");
      await expect(table).toBeVisible();
      expect(await table.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await page.getByRole("tab", { name: "Age & exposure" }).click();
  }

  await page.getByRole("searchbox", { name: "Search" }).fill("no-report-record-will-match");
  await expect(page.getByText("No material age records match")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();

  await page.getByRole("tab", { name: "Storage" }).click();
  await expect(page.getByText("Storage contents")).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    const conexRow = page.getByRole("row", { name: /^Conex 1\b/ });
    const rowBox = await conexRow.boundingBox();
    expect(rowBox).not.toBeNull();
    await conexRow.click({ position: { x: (rowBox?.width ?? 1) - 24, y: (rowBox?.height ?? 1) / 2 } });
  } else {
    await page.locator('a[href="/inventory/storage/conex-1"]:visible').click();
  }
  await expect(page).toHaveURL(/\/inventory\/storage\/conex-1$/);
  await page.goBack();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("Operational activity")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export \d+ rows/ }).click();
  await expect((await download).suggestedFilename()).toMatch(/^tbs-activity-\d{4}-\d{2}-\d{2}\.csv$/);
});

test("reports are accessible at the current viewport", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByText("Operations intelligence")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
