import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithMouse,
  expectTimedEventMissing,
  expectTimedEventVisible,
  fillTitleAndSaveWithMouse,
  openEventForEditingWithMouse,
  openTimedEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

test("should delete a timed event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Timed Event");
  await openTimedEventFormWithMouse(page);
  await fillTitleAndSaveWithMouse(page, title);
  await expectTimedEventVisible(page, title);

  await openEventForEditingWithMouse(page, title);
  await deleteEventWithMouse(page);

  await expectTimedEventMissing(page, title);
});
