import { defineConfig, devices } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const TEST_PORT = 9150;

// Write a minimal compass config for the Playwright web server process.
// This runs at config-load time, before the webServer is started.
const TEST_CONFIG_PATH = join(process.cwd(), ".playwright-compass.yaml");
writeFileSync(
  TEST_CONFIG_PATH,
  [
    "runtime:",
    "  nodeEnv: test",
    "  timezone: Etc/UTC",
    "urls:",
    `  frontend: http://localhost:${TEST_PORT}`,
    "  backendApi: http://localhost:3000/api",
    "  cors:",
    `    - http://localhost:${TEST_PORT}`,
    "mongo:",
    "  uri: mongodb://localhost:27017/unused",
    "supertokens:",
    "  uri: http://localhost:3567",
    "  key: test-key",
    "tokens:",
    "  compassSync: test-token",
    "google:",
    "  clientId: test-client-id",
    "posthog:",
    "  key: test-posthog-key",
    "  host: https://app.posthog.com",
  ].join("\n"),
);

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
