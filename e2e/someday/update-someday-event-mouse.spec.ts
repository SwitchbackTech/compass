import { test } from "@playwright/test";
import {
  createEventTitle,
  expectSomedayEventMissing,
  expectSomedayEventVisible,
  fillTitleAndSaveWithMouse,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test.skip("should update a someday event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveWithMouse(page, title);
  await expectSomedayEventVisible(page, title);

  await page.locator("#sidebar").getByRole("button", { name: title }).click();

  const updatedTitle = updateEventTitle("Someday Event");
  await fillTitleAndSaveWithMouse(page, updatedTitle);

  await expectSomedayEventVisible(page, updatedTitle);
  await expectSomedayEventMissing(page, title);
});
