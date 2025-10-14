import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: process.env.CI ? 60_000 : 30_000, // Longer timeout for CI
  expect: {
    timeout: process.env.CI ? 20_000 : 10_000, // Longer expect timeout for CI
  },
  // Add retries for CI stability
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:9080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "yarn dev:web",
    env: {
      NODE_ENV: "test",
      WEB_IS_DEV: "false",
      GOOGLE_CLIENT_ID: "test-client-id",
      API_BASEURL: "http://localhost:3000/api",
      API_PORT: "3000",
      POSTHOG_KEY: "test-posthog-key",
      POSTHOG_HOST: "https://app.posthog.com",
    },
    port: 9080,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
