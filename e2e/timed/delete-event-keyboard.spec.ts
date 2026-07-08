import { test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithKeyboard,
  expectTimedEventMissing,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.skip(({ isMobile }) => isMobile, "Keyboard shortcuts are desktop-only.");

// Intermittently times out waiting for the title input to hide after save,
// unrelated to any specific PR's diff. See
// https://github.com/SwitchbackTech/compass-calendar/issues/1966 before
// deleting this spec — it was deleted once before for this same symptom and
// had to be restored.
test.fixme("should delete a timed event using keyboard interaction", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Timed Event");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);
  await page.waitForTimeout(1000);

  await openEventForEditingWithKeyboard(page, title);
  await deleteEventWithKeyboard(page);

  await expectTimedEventMissing(page, title);
});
