import { expect, type Page, test } from "@playwright/test";
import {
  createEventTitle,
  expectAllDayEventVisible,
  expectSomedayEventMissing,
  expectSomedayEventVisible,
  fillTitleAndSaveEventForm,
  getMainGridPoint,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

const dragSomedayEventToTimedGrid = async (page: Page, titlePrefix: string) => {
  const title = createEventTitle(titlePrefix);
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveEventForm(page, title);
  await expectSomedayEventVisible(page, title);

  const somedayEvent = page.locator("#sidebar").getByRole("button", {
    name: title,
  });
  const eventBox = await somedayEvent.boundingBox();

  if (!eventBox) {
    throw new Error("Expected the Someday event to be visible.");
  }

  const start = {
    x: eventBox.x + eventBox.width / 2,
    y: eventBox.y + eventBox.height / 2,
  };
  const target = await getMainGridPoint(page, { xRatio: 0.35, yRatio: 0.35 });

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 12 });

  return title;
};

const expectTimedPreviewTextStack = async (page: Page, title: string) => {
  const overlay = page.locator("[data-calendar-interaction-overlay]");
  const titleLabel = overlay.getByText(title);
  const timeLabel = overlay.locator("[data-someday-interaction-time-label]");

  await expect(overlay).toBeVisible();
  await expect(timeLabel).toHaveText(
    /\d{1,2}(?::\d{2})?\s*(AM|PM)?\s+-\s+\d{1,2}(?::\d{2})?\s*(AM|PM)/i,
  );

  await expect
    .poll(async () => {
      const titleBox = await titleLabel.boundingBox();
      const timeBox = await timeLabel.boundingBox();

      if (!titleBox || !timeBox) return false;

      return (
        timeBox.y + timeBox.height / 2 > titleBox.y + titleBox.height / 2 &&
        timeBox.y - titleBox.y < titleBox.height + 8 &&
        timeBox.x < titleBox.x + 8
      );
    })
    .toBe(true);
};

test("shows a timed-grid preview while dragging a someday event", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await page.getByRole("button", { name: "Next week" }).click();
  await page.locator("#mainGrid").waitFor({ state: "visible" });

  const title = await dragSomedayEventToTimedGrid(page, "Someday Drag Preview");
  await expectTimedPreviewTextStack(page, title);

  await page.mouse.up();
});

test("clamps a drag over the week header to the calendar and drops as all-day", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await page.locator("#mainGrid").waitFor({ state: "visible" });

  const title = createEventTitle("Someday Header Clamp");
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveEventForm(page, title);
  await expectSomedayEventVisible(page, title);

  const somedayEvent = page.locator("#sidebar").getByRole("button", {
    name: title,
  });
  const eventBox = await somedayEvent.boundingBox();
  const allDayBox = await page.locator("#allDayColumns").boundingBox();

  if (!eventBox || !allDayBox) {
    throw new Error(
      "Expected the Someday event and all-day row to be visible.",
    );
  }

  // A point in the week header: horizontally over the day columns, but
  // above the all-day row — not a valid drop zone.
  const headerPoint = {
    x: allDayBox.x + allDayBox.width / 2,
    y: allDayBox.y - 10,
  };

  await page.mouse.move(
    eventBox.x + eventBox.width / 2,
    eventBox.y + eventBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(headerPoint.x, headerPoint.y, { steps: 12 });

  // The preview must clamp to the nearest valid zone (the all-day row)
  // instead of following the cursor into the header.
  const overlay = page.locator("[data-calendar-interaction-overlay]");
  await expect(overlay).toBeVisible();
  await expect
    .poll(async () => {
      const overlayBox = await overlay.boundingBox();

      return overlayBox ? overlayBox.y >= allDayBox.y - 1 : false;
    })
    .toBe(true);

  // Dropping commits to the clamped slot: the event lands as an all-day
  // event instead of snapping back to the sidebar.
  await page.mouse.up();

  await expectAllDayEventVisible(page, title);
  await expectSomedayEventMissing(page, title);
});

test("shows a timed-grid preview while dragging over a past slot", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await page.getByRole("button", { name: "Previous week" }).click();
  await page.locator("#mainGrid").waitFor({ state: "visible" });

  const title = await dragSomedayEventToTimedGrid(
    page,
    "Someday Past Drag Preview",
  );
  await expectTimedPreviewTextStack(page, title);

  await page.mouse.up();
});
