import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function locationFromOption(option: string) {
  return option.replace(/\s(?:\u00c2)?\u00b7\s.*$/, "");
}

test("moves a selected lot and preserves a reversible history event", async ({
  page,
}) => {
  await page.goto("/inventory/movements");
  const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024;
  const lotEntry = isDesktop
    ? page.locator("table tbody tr").first()
    : page.locator("article").first();
  const sourceText = await lotEntry.textContent();
  const expectedMaterial = isDesktop
    ? (await lotEntry.locator("td").nth(0).innerText()).trim()
    : (await lotEntry.getByRole("heading").innerText()).trim();
  const expectedProject = isDesktop
    ? (await lotEntry.locator("td").nth(1).innerText()).trim()
    : (await lotEntry.locator("p").first().innerText()).trim();
  const expectedSource = isDesktop
    ? (
        await lotEntry.locator("td").nth(2).locator("span").first().innerText()
      ).trim()
    : (await lotEntry.getByTestId("lot-current-location").innerText()).trim();
  await lotEntry.getByLabel("Select").check();
  const options = await page
    .getByLabel("Destination location")
    .locator("option")
    .allTextContents();
  const destination = options.find(
    (option) =>
      option !== "Select destination" &&
      !sourceText?.includes(locationFromOption(option)),
  )!;
  await page
    .getByLabel("Destination location")
    .selectOption({ label: destination });
  await page.getByLabel("Movement reason").fill("E2E staging move");
  await page.getByLabel("Operator name").fill("Playwright Operator");
  await page.getByRole("button", { name: "Move 1 lot" }).click();

  await expect(
    page.getByText("1 material lot moved and recorded."),
  ).toBeVisible();
  const history = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "E2E staging move" }) });
  await expect(history).toContainText("Playwright Operator");
  await expect(history).toContainText(expectedProject);
  await expect(history).toContainText(expectedMaterial);
  await expect(history.getByRole("button", { name: "Reverse" })).toBeVisible();
  await history
    .getByRole("button", { name: "View movement details for E2E staging move" })
    .click();
  const details = page.getByRole("dialog");
  await expect(
    details.getByRole("heading", { name: "Movement details" }),
  ).toBeVisible();
  await expect(details).toContainText(expectedProject);
  await expect(details).toContainText(expectedMaterial);
  await expect(details).toContainText(expectedSource);
  await expect(details).toContainText(locationFromOption(destination));
  await expect(details).toContainText("Material moved");
});

test("movement workspace is accessible on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inventory/movements");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Material movements",
  );
  await expect(
    page.getByRole("button", { name: "Show 10 more lots" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("legacy material movement route redirects to the canonical workspace", async ({
  page,
}) => {
  await page.goto("/inventory/material-movements");
  await expect(page).toHaveURL(/\/inventory\/movements$/);
});
