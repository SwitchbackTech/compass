import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test("e then t opens the focused event form on the title field", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Sequence Edit");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const eventButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: title });
  await eventButton.focus();

  await page.keyboard.press("e");
  await page.keyboard.press("t");

  const titleInput = page.getByRole("form").getByPlaceholder("Title");
  await expect(titleInput).toBeVisible();
  await expect(titleInput).toBeFocused();
  await expect(titleInput).toHaveValue(title);
});
