import { test } from "@playwright/test";
import {
  createEventTitle,
  expectAllDayEventMissing,
  expectAllDayEventVisible,
  fillTitleAndSaveEventForm,
  openAllDayEventFormWithMouse,
  openEventForEditingWithMouse,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);
test.fixme(
  Boolean(process.env.CI),
  "Flaky in GitHub Actions while waiting for saved all-day events to re-render.",
);

test("should update an all-day event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithMouse(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectAllDayEventVisible(page, title);

  await openEventForEditingWithMouse(page, title);

  const updatedTitle = updateEventTitle("All-Day Event");
  await fillTitleAndSaveEventForm(page, updatedTitle);

  await expectAllDayEventVisible(page, updatedTitle);
  await expectAllDayEventMissing(page, title);
});
