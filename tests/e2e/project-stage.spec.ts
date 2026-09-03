import { expect, test } from "@playwright/test"

test("an Operator can change a project stage from the project overview", async ({ page }) => {
  await page.goto("/inventory/projects/allen-isd")

  await page.getByRole("button", { name: "Change stage" }).click()
  const sheet = page.getByRole("dialog", { name: "Change project stage" })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText(/without changing lot locations, verification, readiness, or Outbound records/i)).toBeVisible()

  const stageSelect = sheet.getByLabel("New project stage")
  const selectedStage = await stageSelect.inputValue()
  await sheet.getByLabel("Change note").fill("Project lifecycle reviewed during acceptance testing.")
  await sheet.getByLabel("Operator name").fill("Project Stage E2E")
  await sheet.getByRole("button", { name: `Change to ${selectedStage}` }).click()

  await expect(sheet).toBeHidden()
  await expect(page.getByText(selectedStage, { exact: true }).first()).toBeVisible()
  await expect(page.getByText(new RegExp(`Project stage changed from .* to ${selectedStage}`)).first()).toBeVisible()
  await expect(page.getByText("Project Stage E2E").first()).toBeVisible()
})
