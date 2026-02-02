import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithKeyboard,
  expectAllDayEventMissing,
  expectAllDayEventVisible,
  fillTitleAndSaveWithKeyboard,
  openAllDayEventFormWithKeyboard,
  openEventForEditingWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Keyboard shortcuts are desktop-only.");

test("should delete an all-day event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithKeyboard(page);
  await fillTitleAndSaveWithKeyboard(page, title);
  await expectAllDayEventVisible(page, title);
  await page.waitForTimeout(1000);

  await openEventForEditingWithKeyboard(page, title);
  await deleteEventWithKeyboard(page);

  await expectAllDayEventMissing(page, title);
});
