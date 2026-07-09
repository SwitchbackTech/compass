import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithMouse,
  expectSomedayEventMissing,
  expectSomedayEventVisible,
  fillTitleAndSaveEventForm,
  openSomedayEventForEditingWithMouse,
  openSomedayEventFormWithMouse,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Someday sidebar is desktop-only.");

test("creates, edits, and deletes a someday event", async ({ page }) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Someday Event");
  await openSomedayEventFormWithMouse(page, "week");
  await fillTitleAndSaveEventForm(page, title);
  await expectSomedayEventVisible(page, title);

  await openSomedayEventForEditingWithMouse(page, title);

  const updatedTitle = updateEventTitle("Someday Event");
  await fillTitleAndSaveEventForm(page, updatedTitle);
  await expectSomedayEventVisible(page, updatedTitle);
  await expectSomedayEventMissing(page, title);

  await openSomedayEventForEditingWithMouse(page, updatedTitle);
  await deleteEventWithMouse(page);
  await expectSomedayEventMissing(page, updatedTitle);
});
