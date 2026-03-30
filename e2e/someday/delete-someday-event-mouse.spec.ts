import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithMouse,
  expectSomedayEventMissing,
  expectSomedayEventVisible,
  fillTitleAndSaveEventForm,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test("should delete a someday event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveEventForm(page, title);
  await expectSomedayEventVisible(page, title);

  await page.locator("#sidebar").getByRole("button", { name: title }).click();
  await deleteEventWithMouse(page);

  await expectSomedayEventMissing(page, title);
});
