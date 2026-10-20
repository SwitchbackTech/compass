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

const macChromeUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test.use({
  viewport: PARITY_VIEWPORT,
  storageState: { cookies: [], origins: [] },
  timezoneId: "UTC",
  colorScheme: "light",
  userAgent: macChromeUserAgent,
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

  test("week-grid-allday", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.locator("#allDayRow").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(outputDir, "week-grid-allday.png") });
  });

  test("demo-events-banner", async ({ page }) => {
    await prepareParityDemoWeek(page, { dismissDemoBanner: false });
    const banner = page
      .getByRole("status")
      .filter({ hasText: "Sample events to help you explore" });
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: join(outputDir, "demo-events-banner.png") });
  });

  test("mod-hold-overlay", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.locator("#mainGrid").focus();
    await page.keyboard.down("Control");
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(outputDir, "mod-hold-overlay.png") });
    await page.keyboard.up("Control");
  });

  test("up-next-banner", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await expect(page.getByRole("region", { name: /up next/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({ path: join(outputDir, "up-next-banner.png") });
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

  test("event-form-date-picker", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.locator("#mainGrid").focus();
    await page.keyboard.press("c");
    await page.locator("#eventFormStartDate").click();
    await expect(page.locator(".react-datepicker")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({
      path: join(outputDir, "event-form-date-picker.png"),
    });
  });

  test("event-form-time-picker", async ({ page }) => {
    await prepareParityDemoWeek(page);
    await page.locator("#mainGrid").focus();
    await page.keyboard.press("c");
    await page.locator("#startTimePicker").click();
    await page.screenshot({
      path: join(outputDir, "event-form-time-picker.png"),
    });
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
