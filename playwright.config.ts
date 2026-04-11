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
    command: "cd packages/web && bun ./src/index.html --console",
    env: {
      NODE_ENV: "test",
      PORT: String(TEST_PORT),
      COMPASS_PUBLIC_API_BASEURL: "http://localhost:3000/api",
      COMPASS_PUBLIC_GOOGLE_CLIENT_ID: "test-client-id",
      COMPASS_PUBLIC_POSTHOG_KEY: "test-posthog-key",
      COMPASS_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
    },
    port: TEST_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
