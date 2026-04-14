import { test } from "@playwright/test";
import {
  createEventTitle,
  expectAllDayEventMissing,
  expectAllDayEventVisible,
  fillTitleAndSaveEventForm,
  openAllDayEventFormWithKeyboard,
  openEventForEditingWithKeyboard,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Keyboard shortcuts are desktop-only.");
test.fixme(
  Boolean(process.env.CI),
  "Flaky in GitHub Actions while waiting for saved all-day events to re-render.",
);

test("should update an all-day event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectAllDayEventVisible(page, title);
  await page.waitForTimeout(1000);

  await openEventForEditingWithKeyboard(page, title);

  const updatedTitle = updateEventTitle("All-Day Event");
  await fillTitleAndSaveEventForm(page, updatedTitle);

  await expectAllDayEventVisible(page, updatedTitle);
  await expectAllDayEventMissing(page, title);
});
