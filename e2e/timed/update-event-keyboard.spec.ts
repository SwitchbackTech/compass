import { test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventMissing,
  expectTimedEventVisible,
  fillTitleAndSaveWithKeyboard,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip("should update a timed event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Timed Event");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveWithKeyboard(page, title);
  await expectTimedEventVisible(page, title);
  await page.waitForTimeout(1000);

  await openEventForEditingWithKeyboard(page, title);

  const updatedTitle = updateEventTitle("Timed Event");
  await fillTitleAndSaveWithKeyboard(page, updatedTitle);

  await expectTimedEventVisible(page, updatedTitle);
  await expectTimedEventMissing(page, title);
});
