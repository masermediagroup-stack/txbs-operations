import { defineConfig, devices } from "@playwright/test";

const browserExecutablePath = process.env.PLAYWRIGHT_BROWSER_PATH;
const testPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testBaseUrl = `http://127.0.0.1:${testPort}`;
const testServerCommand = process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "1"
  ? `npm run start -- -p ${testPort}`
  : `npm run dev -- -p ${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: testBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: browserExecutablePath } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"], launchOptions: { executablePath: browserExecutablePath } },
    },
  ],
  webServer: {
    command: testServerCommand,
    env: { ...process.env, TBS_E2E_AUTH_BYPASS: "1" },
    url: testBaseUrl,
    reuseExistingServer: !process.env.CI && testPort === "3000",
    timeout: 120_000,
  },
});
