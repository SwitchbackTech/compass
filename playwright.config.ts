import { defineConfig, devices } from "@playwright/test";

const TEST_PORT = 9150;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
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
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "cd packages/web && bun run dev.ts",
    env: {
      NODE_ENV: "test",
      GOOGLE_CLIENT_ID: "test-client-id",
      BASEURL: "http://localhost:3000/api",
      POSTHOG_KEY: "test-posthog-key",
      POSTHOG_HOST: "https://app.posthog.com",
      WEB_PORT: `${TEST_PORT}`,
    },
    port: TEST_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
