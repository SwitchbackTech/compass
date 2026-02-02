import { test } from "@playwright/test";
import {
  createEventTitle,
  expectSomedayEventMissing,
  expectSomedayEventVisible,
  fillTitleAndSaveWithKeyboard,
  openEventForEditingWithKeyboard,
  openSomedayEventFormWithKeyboard,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test("should update a someday event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithKeyboard(page);
  await fillTitleAndSaveWithKeyboard(page, title);
  await expectSomedayEventVisible(page, title);
  await page.waitForTimeout(1000);

  await openEventForEditingWithKeyboard(page, title);

  const updatedTitle = updateEventTitle("Someday Event");
  await fillTitleAndSaveWithKeyboard(page, updatedTitle);

  await expectSomedayEventVisible(page, updatedTitle);
  await expectSomedayEventMissing(page, title);
});
