import { test } from "@playwright/test";
import {
  createEventTitle,
  expectAllDayEventVisible,
  fillTitleAndSaveWithMouse,
  openAllDayEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(
  ({ isMobile }) => isMobile,
  "Mouse flows are desktop-only in week view.",
);

test("should create an all-day event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("All-Day Event");
  await openAllDayEventFormWithMouse(page);
  await fillTitleAndSaveWithMouse(page, title);

  await expectAllDayEventVisible(page, title);
});
