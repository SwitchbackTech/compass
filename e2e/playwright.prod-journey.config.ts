import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./journey",
  testMatch: "prod-full-journey.spec.ts",
  timeout: 600_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.PROD_BASE_URL ?? "https://compasscalendar.com",
    colorScheme: "light",
    ...devices["Desktop Chrome"],
  },
});
