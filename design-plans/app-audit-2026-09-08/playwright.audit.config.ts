import base from "../../playwright.config";
import { defineConfig } from "@playwright/test";
export default defineConfig({ ...base, testDir: ".", testMatch: /audit-.*\.spec\.ts/, outputDir: "./focused-results", webServer: { ...base.webServer, command: "npm run start -- -p 3101" }, workers: 1 });