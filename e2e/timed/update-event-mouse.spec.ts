import { test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventMissing,
  expectTimedEventVisible,
  fillTitleAndSaveWithMouse,
  openEventForEditingWithMouse,
  openTimedEventFormWithMouse,
  prepareCalendarPage,
  updateEventTitle,
} from "../utils/event-test-utils";

test("should update a timed event using mouse interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Timed Event");
  await openTimedEventFormWithMouse(page);
  await fillTitleAndSaveWithMouse(page, title);
  await expectTimedEventVisible(page, title);

  await openEventForEditingWithMouse(page, title);

  const updatedTitle = updateEventTitle("Timed Event");
  await fillTitleAndSaveWithMouse(page, updatedTitle);

  await expectTimedEventVisible(page, updatedTitle);
  await expectTimedEventMissing(page, title);
});
