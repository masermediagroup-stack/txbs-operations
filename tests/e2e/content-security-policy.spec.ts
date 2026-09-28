import { expect, test } from "@playwright/test"

const primaryRoutes = [
  "/",
  "/inventory",
  "/inventory/receiving",
  "/inventory/movements",
  "/inventory/outbound",
  "/inventory/issues",
  "/reports",
  "/my-work",
  "/administration",
]

test("enforces the reviewed nonce policy across primary workflows", async ({ page }) => {
  const violations: string[] = []
  page.on("console", (message) => {
    const text = message.text()
    if (/content security policy|refused to (?:load|execute|apply|connect)/i.test(text)) violations.push(text)
  })

  for (const route of primaryRoutes) {
    const response = await page.goto(route)
    expect(response?.ok(), `${route} should load`).toBe(true)
    const headers = response?.headers() ?? {}
    expect(headers["content-security-policy"], `${route} should enforce CSP`).toContain("'strict-dynamic'")
    expect(headers["content-security-policy"]).toContain("worker-src 'self' blob:")
    expect(headers["content-security-policy-report-only"]).toBeUndefined()
    await expect(page.locator("body")).toBeVisible()
  }

  expect(violations).toEqual([])
})
