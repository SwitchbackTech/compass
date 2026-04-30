import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  ensureSidebarOpen,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  openTimedEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

test("should create a timed event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Timed Event");
  await openTimedEventFormWithMouse(page);
  await fillTitleAndSaveEventForm(page, title);

  await expectTimedEventVisible(page, title);
});

test("starts the timed draft in the day column under the pointer after horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);
  await page.locator("#weekGridScroller").evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });

  const targetDayLabel = page.locator("#weekGridScroller [title]").nth(6);
  const mainGrid = page.locator("#mainGrid");
  const targetBox = await targetDayLabel.boundingBox();
  const gridBox = await mainGrid.boundingBox();

  if (!targetBox || !gridBox) {
    throw new Error("Expected the week grid and Friday label to be visible.");
  }

  const x = targetBox.x + targetBox.width / 2;
  const y = gridBox.y + gridBox.height * 0.4;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 80);

  const draftEvent = page.locator(
    '#timedEvents > [role="button"]:not([data-event-id])',
  );
  await expect(draftEvent).toBeVisible();

  const draftBox = await draftEvent.boundingBox();
  if (!draftBox) {
    throw new Error("Expected the timed draft to be visible.");
  }

  const draftCenterX = draftBox.x + draftBox.width / 2;
  expect(draftCenterX).toBeGreaterThanOrEqual(targetBox.x);
  expect(draftCenterX).toBeLessThanOrEqual(targetBox.x + targetBox.width);

  await page.mouse.up();
});
