import { test } from "@playwright/test";
import {
  createEventTitle,
  expectAllDayEventMissing,
  expectAllDayEventVisible,
  fillTitleAndSaveWithMouse,
  openAllDayEventFormWithMouse,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

test("should update an all-day event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithMouse(page);
  await fillTitleAndSaveWithMouse(page, title);
  await expectAllDayEventVisible(page, title);

  await page.locator("#allDayRow").getByRole("button", { name: title }).click();

  const updatedTitle = updateEventTitle("All-Day Event");
  await fillTitleAndSaveWithMouse(page, updatedTitle);

  await expectAllDayEventVisible(page, updatedTitle);
  await expectAllDayEventMissing(page, title);
});
