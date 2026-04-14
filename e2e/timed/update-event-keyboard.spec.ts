import { test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventMissing,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Keyboard shortcuts are desktop-only.");

test("should update a timed event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Timed Event");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  await openEventForEditingWithKeyboard(page, title);

  const updatedTitle = updateEventTitle("Timed Event");
  await fillTitleAndSaveEventForm(page, updatedTitle);

  await expectTimedEventVisible(page, updatedTitle);
  await expectTimedEventMissing(page, title);
});
