import { test } from "@playwright/test";
import {
  createEventTitle,
  expectAllDayEventMissing,
  expectAllDayEventVisible,
  fillTitleAndSaveWithKeyboard,
  openAllDayEventFormWithKeyboard,
  openEventForEditingWithKeyboard,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip("should update an all-day event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithKeyboard(page);
  await fillTitleAndSaveWithKeyboard(page, title);
  await expectAllDayEventVisible(page, title);
  await page.waitForTimeout(1000);

  await openEventForEditingWithKeyboard(page, title);

  const updatedTitle = updateEventTitle("All-Day Event");
  await fillTitleAndSaveWithKeyboard(page, updatedTitle);

  await expectAllDayEventVisible(page, updatedTitle);
  await expectAllDayEventMissing(page, title);
});
