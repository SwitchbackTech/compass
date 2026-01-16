import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithMouse,
  expectSomedayEventMissing,
  expectSomedayEventVisible,
  fillTitleAndSaveWithMouse,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test.skip("should delete a someday event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveWithMouse(page, title);
  await expectSomedayEventVisible(page, title);

  await page.locator("#sidebar").getByRole("button", { name: title }).click();
  await deleteEventWithMouse(page);

  await expectSomedayEventMissing(page, title);
});
