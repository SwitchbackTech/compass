import { expect, test } from "@playwright/test";
import { prepareCalendarPage } from "../utils/event-test-utils";

const panel = (page: Parameters<typeof prepareCalendarPage>[0]) =>
  page.getByRole("region", { name: "Share availability" });

test("A opens Share availability without creating an event draft", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  await page.keyboard.press("a");

  await expect(panel(page)).toBeVisible();
  await expect(page.getByRole("form")).toHaveCount(0);

  await page.keyboard.press("Escape");

  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole("form")).toHaveCount(0);
});

test("A focuses the first offered time and Enter walks through the rest", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await page.keyboard.press("a");
  await expect(panel(page)).toBeVisible();

  const offered = page.getByRole("option");
  await expect(offered).toHaveCount(3);
  // Focus lands on the grid, not the sidebar, so arrows reposition immediately.
  await expect(offered.first()).toBeFocused();

  const preview = page.getByRole("region", {
    name: "Availability message preview",
  });
  const before = await preview.textContent();
  await page.keyboard.press("ArrowDown");
  await expect(preview).not.toHaveText(before ?? "");

  await page.keyboard.press("Enter");
  await expect(offered.nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(offered.nth(2)).toBeFocused();
  // The last Enter hands off to Copy, so one more Enter copies.
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Copy availability to clipboard" }),
  ).toBeFocused();
});

test("offered times line up with their day column", async ({ page }) => {
  await prepareCalendarPage(page);
  await page.keyboard.press("a");
  await expect(panel(page)).toBeVisible();

  const columns = page.locator("#timedColumns");
  const columnsBox = await columns.boundingBox();
  const slotBox = await page.getByRole("option").first().boundingBox();

  expect(columnsBox).not.toBeNull();
  expect(slotBox).not.toBeNull();
  // The hour-label gutter sits left of #timedColumns; a slot that ignores it
  // starts left of the columns box entirely (the bug this guards).
  expect(slotBox!.x).toBeGreaterThanOrEqual(columnsBox!.x);
  expect(slotBox!.x + slotBox!.width).toBeLessThanOrEqual(
    columnsBox!.x + columnsBox!.width + 1,
  );
});
