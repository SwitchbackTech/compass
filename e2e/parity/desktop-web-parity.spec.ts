import { expect, test } from "@playwright/test";
import {
  installParityWebEnvironment,
  PARITY_VIEWPORT,
  prepareParityDemoWeek,
} from "./seed-demo-fixture.util";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const outputDir =
  process.env.PARITY_WEB_OUT ??
  join(process.cwd(), "build", "desktop-parity", "web");

test.use({
  viewport: PARITY_VIEWPORT,
  storageState: { cookies: [], origins: [] },
  timezoneId: "UTC",
  colorScheme: "light",
});

test.describe("Desktop web parity captures", () => {
  test.beforeAll(() => {
    mkdirSync(outputDir, { recursive: true });
  });

  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.title === "onboarding-welcome") return;
    await installParityWebEnvironment(page);
  });

  test("week-grid", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.screenshot({ path: join(outputDir, "week-grid.png") });
  });

  test("mini-calendar", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.keyboard.press("i");
    await expect(page.getByTestId("Month picker")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: join(outputDir, "mini-calendar.png") });
  });

  test("event-form", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.locator("#mainGrid").focus();
    await page.keyboard.press("c");
    await expect(page.getByLabel(/^title$/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: join(outputDir, "event-form.png") });
  });

  test("command-palette", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.keyboard.press("Control+K");
    await expect(page.getByLabel("Command palette search")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: join(outputDir, "command-palette.png") });
  });

  test("settings", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.keyboard.press("Control+,");
    await expect(page.getByRole("button", { name: "Accounts" })).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({ path: join(outputDir, "settings.png") });
  });

  test("onboarding-welcome", async ({ page }) => {
    await installParityWebEnvironment(page, { dismissOnboarding: false });
    await page.goto("/week", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: join(outputDir, "onboarding-welcome.png") });
  });
});
