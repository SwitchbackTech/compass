import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

const TEST_PORT = 9150;
const TEST_CONFIG_PATH = join(process.cwd(), "e2e/compass.playwright.yaml");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "cd packages/web && bun run dev.ts",
    env: {
      COMPASS_CONFIG_FILE: TEST_CONFIG_PATH,
    },
    port: TEST_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
