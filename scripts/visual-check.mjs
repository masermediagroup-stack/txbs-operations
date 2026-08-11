import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_BROWSER_PATH,
  headless: true,
});

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  const responseErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push({ text: message.text(), location: message.location() });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) responseErrors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("http://127.0.0.1:3000/warehouse", { waitUntil: "networkidle" });
  await page.screenshot({ path: `test-results/phase1-warehouse-${viewport.name}.png`, fullPage: true });
  console.log(JSON.stringify({
    viewport: viewport.name,
    title: await page.title(),
    heading: await page.locator("h1").innerText(),
    contentLength: (await page.locator("body").innerText()).length,
    errorOverlayCount: await page.locator("[data-nextjs-dialog]").count(),
    consoleErrors: errors,
    responseErrors,
  }));
  await page.close();
}

await browser.close();
