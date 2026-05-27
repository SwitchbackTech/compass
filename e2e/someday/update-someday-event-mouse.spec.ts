import { test } from "@playwright/test";
import {
  createEventTitle,
  expectSomedayEventMissing,
  expectSomedayEventVisible,
  fillTitleAndSaveEventForm,
  openEventForEditingWithMouse,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test("should update a someday event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveEventForm(page, title);
  await expectSomedayEventVisible(page, title);

  await openEventForEditingWithMouse(page, title);

  const updatedTitle = updateEventTitle("Someday Event");
  await fillTitleAndSaveEventForm(page, updatedTitle);

  await expectSomedayEventVisible(page, updatedTitle);
  await expectSomedayEventMissing(page, title);
});
