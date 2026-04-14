import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithKeyboard,
  expectTimedEventMissing,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Keyboard shortcuts are desktop-only.");

test("should delete a timed event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Timed Event");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  await openEventForEditingWithKeyboard(page, title);
  await deleteEventWithKeyboard(page);

  await expectTimedEventMissing(page, title);
});
