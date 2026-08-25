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
  const lotEntry = isDesktop ? page.locator("table tbody tr").first() : page.locator('input[type="checkbox"]:visible').first().locator("..")
  const sourceText = await lotEntry.textContent()
  await lotEntry.getByRole("checkbox").check()
  if (!isDesktop) await page.getByRole("button", { name: "Review move (1)" }).click()
  const actionSurface = isDesktop ? page : page.getByRole("dialog")
  const options = await actionSurface.getByLabel("Destination location").locator("option").allTextContents()
  const destination = options.find((option) => option !== "Select destination" && !sourceText?.includes(locationFromOption(option)))!
  await actionSurface.getByLabel("Destination location").selectOption({ label: destination })
  await actionSurface.getByLabel("Movement reason").fill("Offline field move")
  await actionSurface.getByLabel("Operator name").fill("Offline Operator")
  const photoInput = isDesktop
    ? actionSurface.getByLabel("Proof photo")
    : actionSurface.getByLabel("Add movement photos 1 of 3")
  await photoInput.setInputFiles({ name: "offline-yard-proof.jpg", mimeType: "image/jpeg", buffer: Buffer.from("offline yard proof") })
  await actionSurface.getByRole("button", { name: "Move 1 lot" }).click()

  if (isDesktop) {
    await expect(actionSurface.getByText("1 material lot saved on this device and queued for shared sync.")).toBeVisible()
  } else {
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.locator('[role="alert"]:visible').filter({ hasText: "1 material lot saved on this device and queued for shared sync." })).toBeVisible()
    await expect(page.getByRole("button", { name: "Toggle Sidebar" })).toBeVisible()
  }
  await page.getByTestId("sync-status-trigger").click()
  const sheet = page.getByRole("dialog")
  await expect(sheet.getByText("Move material", { exact: true })).toBeVisible()
  await expect(sheet.getByText("Offline Operator")).toBeVisible()
  await expect(sheet.getByText("1 photo retained")).toBeVisible()
  await expect(sheet.getByRole("button", { name: "Sync now" })).toBeDisabled()

  const replay = { command: null as { payload?: { photoUploads?: unknown[] } } | null }
  await page.route("**/api/inventory/uploads", async (route) => {
    expect(route.request().headers()["content-type"]).toBe("image/jpeg")
    expect(route.request().headers()["x-tbs-queued-upload"]).toBe("1")
    expect(route.request().postDataBuffer()?.toString()).toBe("offline yard proof")
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "10000000-0000-4000-8000-000000000099", fileName: "offline-yard-proof.jpg" }),
    })
  })
  await page.route("**/api/inventory/commands/v1", async (route) => {
    replay.command = route.request().postDataJSON() as { payload?: { photoUploads?: unknown[] } }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entityId: "10000000-0000-4000-8000-000000000098" }) })
  })
  await context.setOffline(false)
  await expect(sheet.getByText("No local-only actions")).toBeVisible()
  expect(replay.command?.payload?.photoUploads).toHaveLength(1)
})

test("offline fallback explains how to continue safely", async ({ page }) => {
  await page.goto("/offline")
  await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Try Inventory again" })).toBeVisible()
})
