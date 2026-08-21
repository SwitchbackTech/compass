import { test } from "@playwright/test";
import {
  createEventTitle,
  expectAllDayEventVisible,
  fillTitleAndSaveEventForm,
  openAllDayEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test("creates an all-day event", async ({ page }) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);

  await expectAllDayEventVisible(page, title);
});
