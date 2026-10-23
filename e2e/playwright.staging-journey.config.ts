import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./journey",
  testMatch: "staging-full-journey.spec.ts",
  timeout: 300_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL:
      process.env.STAGING_BASE_URL ?? "https://staging.compasscalendar.com",
    colorScheme: "light",
    ...devices["Desktop Chrome"],
  },
});
