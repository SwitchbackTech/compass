import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

const getFormTitleInput = (page: import("@playwright/test").Page) =>
  page.getByRole("form").getByRole("textbox", { name: "Title" });

test("event form has no field-level copy buttons", async ({ page }) => {
  await prepareCalendarPage(page);
  await openTimedEventFormWithKeyboard(page);

  await expect(getFormTitleInput(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "copy event" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "copy event title" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "copy event location" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "copy event description" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "copy attendee list" }),
  ).toHaveCount(0);
});

test("text can be selected in the event title field", async ({ page }) => {
  await prepareCalendarPage(page);
  await openTimedEventFormWithKeyboard(page);

  const titleField = getFormTitleInput(page);
  await titleField.fill("Selectable title");
  await titleField.selectText();

  const selected = await titleField.evaluate(
    (el) =>
      (el as HTMLInputElement).selectionStart !==
      (el as HTMLInputElement).selectionEnd,
  );
  expect(selected).toBe(true);
});

test("keyboard-only hint is not shown on the first mouse click", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("No Immediate Hint");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const eventButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: title });

  await eventButton.click({ force: true });
  await expect(page.locator("[data-pointer-hint]")).toHaveCount(0);
});

test("keyboard activation of native buttons still works", async ({ page }) => {
  await prepareCalendarPage(page);

  const timezoneButton = page.getByRole("button", {
    name: /Calendar timezone/,
  });
  await timezoneButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox")).toHaveCount(0);
});
