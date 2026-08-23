import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  getMainGridPoint,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

// Compass is the keyboard calendar: the mouse is permanently inert. These
// tests are the behavioral contract for the always-on pointer suppression.

test("mouse clicks are inert and show the keyboard-only hint", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Mouse Inert Target");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const eventButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: title });

  await eventButton.click({ force: true });
  await expect(page.getByLabel("Title")).toHaveCount(0);
  await expect(eventButton).toBeFocused();
  await expect(page.locator("[data-pointer-hint]")).toBeVisible();

  // Clicking empty grid does not open a draft either.
  const { x, y } = await getMainGridPoint(page, { xRatio: 0.6, yRatio: 0.6 });
  await page.mouse.click(x, y);
  await expect(page.getByLabel("Title")).toHaveCount(0);

  // A blocked click still selects the event so Enter opens it without
  // an extra keyboard focus step.
  await eventButton.click({ force: true });
  await expect(page.getByLabel("Title")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Title")).toBeVisible();
});

test("keyboard activation of native buttons still works", async ({ page }) => {
  await prepareCalendarPage(page);

  // Enter on a focused native button fires a trusted click with detail 0;
  // the blocker must pass it or every button in the app dies.
  const timezoneButton = page.getByRole("button", {
    name: /Calendar timezone/,
  });
  await timezoneButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox")).toHaveCount(0);
});

test("right-click is blocked; m opens the menu instead", async ({ page }) => {
  await prepareCalendarPage(page);
  const title = createEventTitle("No Right Click");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);

  const eventButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: title });

  await eventButton.click({ button: "right", force: true });
  await expect(page.getByRole("menuitem")).toHaveCount(0);

  await eventButton.focus();
  await page.keyboard.press("m");
  await expect(page.getByRole("menuitem").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem")).toHaveCount(0);

  await eventButton.focus();
  await page.keyboard.press("Shift+F10");
  await expect(page.getByRole("menuitem").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem")).toHaveCount(0);
});
