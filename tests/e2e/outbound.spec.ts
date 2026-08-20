import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("prepares, readies, and departs project material without requiring a photo", async ({ page }) => {
  await page.goto("/inventory/projects/plano-west")

  await page.getByRole("button", { name: "Verify material" }).first().click()
  let sheet = page.locator('[data-slot="sheet-content"]')
  await sheet.getByLabel("Operator name").fill("Playwright Yard Operator")
  await sheet.getByRole("button", { name: "Save verification" }).click()
  await expect(sheet).toBeHidden()

  await page.getByRole("link", { name: "Prepare outbound" }).click()
  await expect(page).toHaveURL(/\/inventory\/outbound\?project=/)
  const selectedProject = await page.getByLabel("Project").inputValue()
  expect(selectedProject).not.toBe("")

  await page.getByRole("checkbox").first().check()
  const selectionSurface = (page.viewportSize()?.width ?? 0) >= 1024 ? "desktop" : "mobile"
  await page.locator(`input[id^="outbound-quantity-${selectionSurface}-"]:not([disabled])`).fill("1")
  await page.getByLabel("Operator name").fill("Playwright Outbound Planner")
  await page.getByRole("button", { name: "Plan 1 lot" }).click()
  await expect(page.getByText("1 material lot reserved in a planned outbound batch.")).toBeVisible()
  const activeBatch = page.locator('[data-slot="card"]').filter({ has: page.getByRole("button", { name: "Mark ready" }) })
  const remainingBeforeDeparture = Number(await activeBatch.locator("tbody tr").first().locator("td").last().textContent())

  await page.getByRole("button", { name: "Mark ready" }).click()
  sheet = page.locator('[data-slot="sheet-content"]')
  await sheet.getByLabel("Operator name").fill("Playwright Yard Lead")
  await sheet.getByRole("button", { name: "Mark batch ready" }).click()
  await expect(page.getByRole("button", { name: "Record departure" })).toBeVisible()

  await page.getByRole("button", { name: "Record departure" }).click()
  sheet = page.locator('[data-slot="sheet-content"]')
  await sheet.getByLabel("Operator name").fill("Playwright Yard Lead")
  await sheet.getByLabel("Departure note").fill("Final count confirmed")
  await sheet.getByRole("button", { name: "Record departure" }).click()

  const departed = page.locator('[data-slot="card"]').filter({ has: page.getByText("Departed", { exact: true }) })
  await expect(departed).toContainText("Final count confirmed")
  await expect(departed.locator("tbody tr").first().locator("td").last()).toHaveText(String(remainingBeforeDeparture - 1))
  await expect(departed.getByRole("button", { name: "Reverse departure" })).toBeVisible()
})

test("outbound workspace has no serious accessibility violations", async ({ page }) => {
  await page.goto("/inventory/outbound")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()

  expect(results.violations).toEqual([])
})
