import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("known-project receiving creates a durable material lot", async ({ page }) => {
  await page.goto("/inventory/receiving")
  await page.getByLabel("Receipt or packing-slip number").fill("E2E-RCV-100")
  await page.getByLabel("Handwritten project text").fill("Allen ISD")
  await page.getByLabel("Matched project").selectOption({ label: "Allen ISD" })
  await page.getByLabel("Inspection result").selectOption("Passed")
  await page.getByLabel("Material name").fill("E2E field accessories")
  await page.getByLabel("Quantity").fill("2")
  await page.getByLabel("Condition").selectOption("Good")
  await page.getByLabel("Storage assignment").selectOption({ label: "Conex 4" })
  await page.getByLabel("Material photo").setInputFiles({ name: "received-material.jpg", mimeType: "image/jpeg", buffer: Buffer.from("material evidence") })
  await page.getByLabel("Physical handwritten project label applied").check()
  await page.getByLabel("Staging / default location").selectOption({ label: "Conex 4" })
  await page.getByLabel("Operator name").fill("Playwright Operator")
  await page.getByRole("button", { name: "Review and receive" }).click()

  await expect(page.getByText("Shipment received. Material lots, verification, photos, and activity were created together.")).toBeVisible()
  await page.goto("/inventory/projects/allen-isd")
  await expect(page.getByRole("heading", { name: "E2E field accessories" })).toBeVisible()
})

test("receiving requires line photos while allowing a photo-free draft", async ({ page }) => {
  await page.goto("/inventory/receiving")
  await page.getByLabel("Receipt or packing-slip number").fill("E2E-RCV-PHOTO-RULE")
  await page.getByLabel("Material name").fill("Photo requirement fixture")
  await page.getByLabel("Operator name").fill("Playwright Operator")
  await page.getByRole("button", { name: "Review and receive" }).click()
  await expect(page.getByText("Add a material photo to receipt line 1 before receiving.")).toBeVisible()
  await page.getByRole("button", { name: "Save draft" }).click()
  await expect(page.getByText("Draft saved on this device. You can close the page and resume later.")).toBeVisible()
})

test("receiving is accessible at the current viewport", async ({ page }) => {
  await page.goto("/inventory/receiving")
  await expect(page.getByLabel("Receipt or packing-slip number")).toBeVisible()
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()
  expect(results.violations).toEqual([])
})
