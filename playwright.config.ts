import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
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
