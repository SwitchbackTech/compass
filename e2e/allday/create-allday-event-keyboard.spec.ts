import { test } from "@playwright/test";
import {
  createEventTitle,
  expectAllDayEventVisible,
  fillTitleAndSaveWithKeyboard,
  openAllDayEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip("should create an all-day event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithKeyboard(page);
  await fillTitleAndSaveWithKeyboard(page, title);

  await expectAllDayEventVisible(page, title);
});
