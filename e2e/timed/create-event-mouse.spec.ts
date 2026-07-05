import { expect, type Page, test } from "@playwright/test";
import {
  createEventTitle,
  ensureSidebarOpen,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  fillTitleAndSubmitEventFormWithEnter,
  getMainGridPoint,
  getVisibleDayDates,
  openTimedEventFormWithMouse,
  prepareCalendarPage,
  type StoredTimedEvent,
  waitForSavedEventByTitle,
} from "../utils/event-test-utils";

const getTimedDraftEvent = (page: Page) =>
  page.locator('#timedEvents > [role="button"]:not([data-event-id])');

const getDurationMinutes = (event: StoredTimedEvent) => {
  if (!event.startDate || !event.endDate) {
    throw new Error("Expected saved event to have start and end dates.");
  }

  return (
    (new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) /
    60_000
  );
};

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
  await fillTitleAndSubmitEventFormWithEnter(page, title);

  await expectTimedEventVisible(page, title);
});

test("opens a 15-minute timed event from a quick grid click", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Quick Click Timed Event");
  const { x, y } = await getMainGridPoint(page);

  await page.mouse.click(x, y);

  await page.mouse.move(x, y + 180);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const savedEvent = await waitForSavedEventByTitle(page, title);

  expect(getDurationMinutes(savedEvent)).toBe(15);
  await expect(getTimedDraftEvent(page)).toHaveCount(0);
});

test("keeps drag-to-create duration when the pointer moves before release", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Dragged Timed Event");
  const { x, y } = await getMainGridPoint(page);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 160, { steps: 8 });
  await page.mouse.up();

  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const savedEvent = await waitForSavedEventByTitle(page, title);

  expect(getDurationMinutes(savedEvent)).toBeGreaterThan(15);
  await expect(getTimedDraftEvent(page)).toHaveCount(0);
});

test("starts the timed draft in the day column under the pointer at a reduced day count", async ({
  page,
}) => {
  // 900px with the sidebar open shows a reduced day window (no horizontal
  // scroll); the draft must still land in the column under the pointer.
  await page.setViewportSize({ width: 900, height: 1000 });
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);

  const visibleDayCount = (await getVisibleDayDates(page)).length;
  expect(visibleDayCount).toBeGreaterThan(1);
  expect(visibleDayCount).toBeLessThan(7);

  const targetDayLabel = page
    .locator("#weekGridScroller [title]")
    .nth(visibleDayCount - 1);
  const mainGrid = page.locator("#mainGrid");
  const targetBox = await targetDayLabel.boundingBox();
  const gridBox = await mainGrid.boundingBox();

  if (!targetBox || !gridBox) {
    throw new Error(
      "Expected the week grid and target day label to be visible.",
    );
  }

  const x = targetBox.x + targetBox.width / 2;
  const y = gridBox.y + gridBox.height * 0.4;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 80);

  const draftEvent = getTimedDraftEvent(page);
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
