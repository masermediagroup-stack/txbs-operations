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
    : page.locator('input[type="checkbox"]:visible').first().locator("..");
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
  await lotEntry.getByRole("checkbox").check();
  if (!isDesktop) await page.getByRole("button", { name: "Review move (1)" }).click();
  const actionSurface = isDesktop ? page : page.getByRole("dialog");
  const options = await actionSurface
    .getByLabel("Destination location")
    .locator("option")
    .allTextContents();
  const destination = options.find(
    (option) =>
      option !== "Select destination" &&
      !sourceText?.includes(locationFromOption(option)),
  )!;
  await actionSurface
    .getByLabel("Destination location")
    .selectOption({ label: destination });
  await actionSurface.getByLabel("Movement reason").fill("E2E staging move");
  await actionSurface.getByLabel("Operator name").fill("Playwright Operator");
  const photoFiles = [1, 2, 3].map((value) => ({ name: `movement-${value}.jpg`, mimeType: "image/jpeg", buffer: Buffer.from(`movement evidence ${value}`) }));
  if (isDesktop) await actionSurface.getByLabel("Proof photo").setInputFiles(photoFiles);
  else for (const [index, file] of photoFiles.entries()) await actionSurface.getByLabel(`Add movement photos ${index + 1} of 3`).setInputFiles(file);
  await actionSurface.getByRole("button", { name: "Move 1 lot" }).click();

  if (isDesktop) {
    await expect(
      actionSurface.getByText("1 material lot moved and recorded.", { exact: true }),
    ).toBeVisible();
  } else {
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator('[role="alert"]:visible').filter({ hasText: "1 material lot moved and recorded." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Toggle Sidebar" })).toBeVisible();
  }
  const history = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "E2E staging move" }) });
  await expect(history).toContainText("Playwright Operator");
  await expect(history).toContainText(expectedProject);
  await expect(history).toContainText(expectedMaterial);
  await expect(history).toContainText("3 photos attached");
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
  await expect(details.getByRole("heading", { name: "Movement photos" })).toBeVisible();
  await expect(details.getByRole("img", { name: /Movement photo/ })).toHaveCount(3);
  await expect(details.getByRole("link", { name: /Open full-size movement photo/ })).toHaveCount(3);
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
  await page.locator('input[type="checkbox"]:visible').first().check();
  await expect(page.getByRole("button", { name: "Review move (1)" })).toBeVisible();
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
