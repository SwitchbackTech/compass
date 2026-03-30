import { test } from "@playwright/test";
import {
  createEventTitle,
  expectSomedayEventVisible,
  fillTitleAndSaveEventForm,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test("should create a someday event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveEventForm(page, title);

  await expectSomedayEventVisible(page, title);
});
