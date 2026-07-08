import { expect, test } from "@playwright/test";

// Auto-collapse only fires when a breakpoint is crossed (matchMedia change
// events), so manual toggles stick until the next crossing. Breakpoints live
// in packages/web/src/common/constants/responsive.constants.ts:
// sidebar 1280px, day-view task list 720px.

test.describe("Responsive sidebar", () => {
  test("auto-collapses on crossing 1280px and honors manual reopen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/week");
    await expect(page.locator("#sidebar")).toBeVisible();

    // Crossing below 1280px collapses the sidebar
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect(page.locator("#sidebar")).toHaveCount(0);

    // Manual reopen wins while narrow
    await page.keyboard.press("[");
    await expect(page.locator("#sidebar")).toBeVisible();

    // Resizing without crossing a breakpoint keeps the manual choice
    await page.setViewportSize({ width: 1000, height: 900 });
    await expect(page.locator("#sidebar")).toBeVisible();

    // Crossing back above 1280px keeps it open
    await page.setViewportSize({ width: 1300, height: 900 });
    await expect(page.locator("#sidebar")).toBeVisible();
  });

  test("starts collapsed when loading in a narrow window", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto("/week");
    await page.locator("#timedColumns").waitFor();
    await expect(page.locator("#sidebar")).toHaveCount(0);
  });

  test("toggles with [ from the day view", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/day");
    await expect(page.locator("#sidebar")).toBeVisible();

    await page.keyboard.press("[");
    await expect(page.locator("#sidebar")).toHaveCount(0);

    await page.keyboard.press("[");
    await expect(page.locator("#sidebar")).toBeVisible();
  });

  test("never mounts on refresh when collapsed", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/week");
    await expect(page.locator("#sidebar")).toBeVisible();

    await page.keyboard.press("[");
    await expect(page.locator("#sidebar")).toHaveCount(0);

    // The store seeds from the persisted preference, so the sidebar must be
    // absent as soon as the grid renders — not collapse after a first paint.
    await page.reload();
    await page.locator("#timedColumns").waitFor();
    await expect(page.locator("#sidebar")).toHaveCount(0);
  });
});

test.describe("Responsive day view task list", () => {
  const taskList = '[aria-label="daily-tasks"]';

  test("hides the task list below 720px", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto("/day");
    await expect(page.locator(taskList)).toBeVisible();

    // Crossing below 720px collapses the task list (sidebar is already gone)
    await page.setViewportSize({ width: 680, height: 900 });
    await expect(page.locator(taskList)).toHaveCount(0);
    await expect(page.locator("#sidebar")).toHaveCount(0);

    // The daily agenda stays visible
    await expect(page.locator("#mainSection")).toBeVisible();
  });

  test("starts without the task list when loading in a narrow window", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 680, height: 900 });
    await page.goto("/day");
    await expect(page.locator("#mainSection")).toBeVisible();
    await expect(page.locator(taskList)).toHaveCount(0);
  });
});
