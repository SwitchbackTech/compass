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

test("event form copy buttons copy field text", async ({ page, context }) => {
  await prepareCalendarPage(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  const title = createEventTitle("Copy Field Target");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const eventButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: title });
  await eventButton.focus();
  await page.keyboard.press("Enter");

  await expect(getFormTitleInput(page)).toBeVisible();

  await page.getByRole("button", { name: "copy event title" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(title);
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
