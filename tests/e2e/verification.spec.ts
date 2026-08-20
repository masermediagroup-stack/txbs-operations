import { expect, test } from "@playwright/test";

test("verification worklist provides a direct per-material workflow", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Materials to verify/ }).first().click();

  await expect(page).toHaveURL(/\/reports#material-verification-worklist$/);
  await expect(page.getByText("Material verification worklist")).toBeVisible();

  const allenLink = page.getByRole("link", { name: /Allen ISD/ }).first();
  const allenRecord = page.locator("tr, article").filter({ has: allenLink }).first();
  await expect(allenRecord.getByRole("button", { name: "Verify material" })).toBeVisible();
  await allenLink.click();

  await expect(page).toHaveURL(/\/inventory\/projects\/allen-isd#material-lot-/);
  const targetId = await page.evaluate(() => window.location.hash.slice(1));
  const targetedLot = page.locator(`#${targetId}`);
  await expect(targetedLot).toBeVisible();
  await targetedLot.getByRole("button", { name: "Verify material" }).click();

  const sheet = page.getByRole("dialog", { name: "Verify material" });
  await expect(sheet.getByLabel("Storage location")).not.toHaveValue("");
  await sheet.getByLabel("Operator name").fill("Verification E2E");
  await sheet.getByRole("button", { name: "Save verification" }).click();
  await expect(sheet).toBeHidden();

  await page.goto("/reports#material-verification-worklist");
  const recordSelector = (page.viewportSize()?.width ?? 0) >= 1024 ? "tr" : "article";
  const verifiedRecord = page.locator(recordSelector).filter({ hasText: "Allen ISD" }).filter({ hasText: "Marker Boards" }).first();
  const verifiedBadge = verifiedRecord.getByText("Verified", { exact: true });
  await expect(verifiedBadge).toBeVisible();
  await expect(verifiedBadge).toHaveClass(/bg-brand-orange/);
  await expect(verifiedRecord.getByRole("button", { name: "Verify material" })).toHaveCount(0);
});
