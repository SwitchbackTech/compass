import { expect, type Page, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  getSavedEventsByTitle,
  getVisibleDayDates,
  openTimedEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

// Regression: the drag layout cache used to assume 7 day columns and seed the
// event's day index week-absolutely, so at a reduced day count the mid-drag
// visual snapped between two days and drops could land on the wrong day.
test("aligns the mid-drag visual and drops on the hovered day at a reduced day count", async ({
  page,
}) => {
  // 1000px: sidebar auto-collapsed, track ~968px -> 6 visible days
  await page.setViewportSize({ width: 1000, height: 1000 });
  await prepareCalendarPage(page);

  const title = createEventTitle("Move Narrow");
  await openTimedEventFormWithMouse(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const columns = await getDayColumnBoxes(page);
  expect(columns.length).toBeGreaterThan(1);
  expect(columns.length).toBeLessThan(7);

  const dayDates = await getVisibleDayDates(page);
  expect(dayDates).toHaveLength(columns.length);

  const savedEvent = page
    .locator('#timedEvents [role="button"][data-event-id]')
    .filter({ hasText: title });
  const eventBox = await savedEvent.boundingBox();
  if (!eventBox) {
    throw new Error("Expected the saved event to be visible.");
  }

  const eventCenterX = eventBox.x + eventBox.width / 2;
  const sourceColumnIndex = columns.findIndex(
    (column) => eventCenterX >= column.left && eventCenterX < column.right,
  );
  // Drag toward whichever neighbor exists
  const targetColumnIndex =
    sourceColumnIndex + 1 < columns.length
      ? sourceColumnIndex + 1
      : sourceColumnIndex - 1;
  const targetColumn = columns[targetColumnIndex];
  const targetX = (targetColumn.left + targetColumn.right) / 2;

  await page.mouse.move(eventCenterX, eventBox.y + eventBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, eventBox.y + eventBox.height / 2 + 60, {
    steps: 10,
  });
  // Let the interaction engine paint the moved visual
  await page.waitForTimeout(150);

  // While the mouse is still down, the draft event (the moving
  // visual) must sit centered inside the target column, not between two
  // columns
  const draftEvent = page.locator("[data-calendar-draft-event]");
  await expect(draftEvent).toBeVisible();
  const draftEventBox = await draftEvent.boundingBox();
  if (!draftEventBox) {
    throw new Error("Expected the drag draft event to be visible.");
  }

  const draftEventCenterX = draftEventBox.x + draftEventBox.width / 2;
  const targetCenterX = (targetColumn.left + targetColumn.right) / 2;
  expect(Math.abs(draftEventCenterX - targetCenterX)).toBeLessThanOrEqual(5);

  await page.mouse.up();

  // The persisted event lands on the hovered column's rendered date
  await expect
    .poll(async () => (await getSavedEventsByTitle(page, title))[0]?.startDate)
    .toContain(dayDates[targetColumnIndex]);
});

const getDayColumnBoxes = async (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#timedColumns > [role='columnheader']")]
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.width > 0)
      .map((rect) => ({ left: rect.left, right: rect.right })),
  );
