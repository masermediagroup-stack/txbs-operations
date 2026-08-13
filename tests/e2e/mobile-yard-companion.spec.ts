import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

function locationFromOption(option: string) {
  return option.replace(/\s(?:\u00c2)?\u00b7\s.*$/, "")
}

test("publishes an installable manifest and secured service worker", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest")
  expect(manifestResponse.ok()).toBeTruthy()
  const manifest = await manifestResponse.json()
  expect(manifest).toMatchObject({ name: "TBS Operations Yard Companion", short_name: "TBS Yard", start_url: "/inventory", display: "standalone" })
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

  const workerResponse = await request.get("/sw.js")
  expect(workerResponse.ok()).toBeTruthy()
  expect(workerResponse.headers()["content-type"]).toContain("application/javascript")
  expect(workerResponse.headers()["cache-control"]).toContain("no-store")
  expect(workerResponse.headers()["service-worker-allowed"]).toBe("/")
})

test("yard sync sheet prepares storage and remains accessible", async ({ page }) => {
  await page.goto("/inventory")
  await page.getByTestId("sync-status-trigger").click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByRole("heading", { name: "Yard sync" })).toBeVisible()
  await expect(sheet.getByText("No local-only actions")).toBeVisible()
  await sheet.getByRole("button", { name: "Prepare this device" }).click()
  await expect(sheet.getByText(/Prepared/)).toBeVisible()

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

test("an offline movement is retained and visibly queued on the device", async ({ page, context }) => {
  await page.goto("/inventory/movements")
  await context.setOffline(true)
  await expect(page.getByTestId("sync-status-trigger")).toHaveAttribute("aria-label", /Offline/)

  const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024
  const lotEntry = isDesktop ? page.locator("table tbody tr").first() : page.locator("article").first()
  const sourceText = await lotEntry.textContent()
  await lotEntry.getByLabel("Select").check()
  const options = await page.getByLabel("Destination location").locator("option").allTextContents()
  const destination = options.find((option) => option !== "Select destination" && !sourceText?.includes(locationFromOption(option)))!
  await page.getByLabel("Destination location").selectOption({ label: destination })
  await page.getByLabel("Movement reason").fill("Offline field move")
  await page.getByLabel("Operator name").fill("Offline Operator")
  await page.getByRole("button", { name: "Move 1 lot" }).click()

  await expect(page.getByText("1 material lot saved on this device and queued for shared sync.")).toBeVisible()
  await page.getByTestId("sync-status-trigger").click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByText("Move material", { exact: true })).toBeVisible()
  await expect(sheet.getByText("Offline Operator")).toBeVisible()
  await expect(sheet.getByRole("button", { name: "Sync now" })).toBeDisabled()
  await context.setOffline(false)
})

test("offline fallback explains how to continue safely", async ({ page }) => {
  await page.goto("/offline")
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Try Inventory again" })).toBeVisible()
})
