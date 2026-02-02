import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithMouse,
  expectAllDayEventMissing,
  expectAllDayEventVisible,
  fillTitleAndSaveWithMouse,
  openAllDayEventFormWithMouse,
  openEventForEditingWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

test("should delete an all-day event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithMouse(page);
  await fillTitleAndSaveWithMouse(page, title);
  await expectAllDayEventVisible(page, title);

  await openEventForEditingWithMouse(page, title);
  await deleteEventWithMouse(page);

  await expectAllDayEventMissing(page, title);
});
