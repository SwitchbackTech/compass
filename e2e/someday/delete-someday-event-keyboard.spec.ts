import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithKeyboard,
  expectSomedayEventMissing,
  expectSomedayEventVisible,
  fillTitleAndSaveWithKeyboard,
  openEventForEditingWithKeyboard,
  openSomedayEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test.skip("should delete a someday event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithKeyboard(page);
  await fillTitleAndSaveWithKeyboard(page, title);
  await expectSomedayEventVisible(page, title);

  await openEventForEditingWithKeyboard(page, title);
  await deleteEventWithKeyboard(page);

  await expectSomedayEventMissing(page, title);
});
