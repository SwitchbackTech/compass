import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithMouse,
  expectAllDayEventMissing,
  expectAllDayEventVisible,
  fillTitleAndSaveWithMouse,
  openAllDayEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test("should delete an all-day event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithMouse(page);
  await fillTitleAndSaveWithMouse(page, title);
  await expectAllDayEventVisible(page, title);

  await page.locator("#allDayRow").getByRole("button", { name: title }).click();
  await deleteEventWithMouse(page);

  await expectAllDayEventMissing(page, title);
});
