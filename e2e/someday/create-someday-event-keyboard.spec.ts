import { test } from "@playwright/test";
import {
  createEventTitle,
  expectSomedayEventVisible,
  fillTitleAndSaveWithKeyboard,
  openSomedayEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test("should create a someday event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithKeyboard(page);
  await fillTitleAndSaveWithKeyboard(page, title);

  await expectSomedayEventVisible(page, title);
});
