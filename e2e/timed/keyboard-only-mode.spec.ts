import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  getMainGridPoint,
  prepareCalendarPage,
} from "../utils/event-test-utils";

type CalendarPage = Parameters<typeof prepareCalendarPage>[0];

const keyboardOnlyIndicator = (page: CalendarPage) =>
  page.locator("[data-keyboard-only-indicator]");

const createTimedEventOnGrid = async (page: CalendarPage, label: string) => {
  const title = createEventTitle(label);
  const { x, y } = await getMainGridPoint(page, {
    xRatio: 0.42,
    yRatio: 0.35,
  });
  await page.mouse.click(x, y);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);
  return page.locator("#mainGrid").getByRole("button", { name: title });
};

test("h enters keyboard-only mode; clicks are inert until Escape", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  const eventButton = await createTimedEventOnGrid(
    page,
    "Keyboard Only Target",
  );

  await page.keyboard.press("h");

  await expect(keyboardOnlyIndicator(page)).toContainText("Hardcore Mode");
  await expect(keyboardOnlyIndicator(page)).toContainText("Esc");

  // Shortcuts overlay stays mounted with role=dialog even when closed, so
  // assert the event form did not open rather than dialog count.
  await eventButton.click({ force: true });
  await expect(page.getByLabel("Title")).toHaveCount(0);
  await expect(keyboardOnlyIndicator(page)).toBeVisible();
  await expect(eventButton).not.toBeFocused();

  await page.keyboard.press("Escape");
  await expect(keyboardOnlyIndicator(page)).toHaveCount(0);

  await eventButton.click();
  await expect(page.getByLabel("Title")).toBeVisible();
});

test("h exits keyboard-only mode and restores clicks", async ({ page }) => {
  await prepareCalendarPage(page);
  const eventButton = await createTimedEventOnGrid(
    page,
    "Keyboard Only Toggle Exit",
  );

  await page.keyboard.press("h");
  await expect(keyboardOnlyIndicator(page)).toBeVisible();

  await page.keyboard.press("h");
  await expect(keyboardOnlyIndicator(page)).toHaveCount(0);

  await eventButton.click();
  await expect(page.getByLabel("Title")).toBeVisible();
});

test("keyboard activation of native buttons still works while clicks are blocked", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  await page.keyboard.press("h");
  await expect(keyboardOnlyIndicator(page)).toBeVisible();

  // Enter on a focused native button fires a trusted click with detail 0;
  // the blocker must pass it or every button in the app dies.
  const timezoneButton = page.getByRole("button", {
    name: /Calendar timezone/,
  });
  await timezoneButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox")).toBeVisible();

  // Escape is owned by the dialog first; the mode stays on.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(keyboardOnlyIndicator(page)).toBeVisible();
});

test("right-click context menu is blocked while keyboard-only is on", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  const eventButton = await createTimedEventOnGrid(page, "No Right Click");

  await page.keyboard.press("h");
  await expect(keyboardOnlyIndicator(page)).toBeVisible();

  await eventButton.click({ button: "right", force: true });
  await expect(page.getByRole("menuitem")).toHaveCount(0);

  // Positive control: the same gesture opens the menu once the mode is off.
  await page.keyboard.press("Escape");
  await expect(keyboardOnlyIndicator(page)).toHaveCount(0);
  await eventButton.click({ button: "right" });
  await expect(page.getByRole("menuitem").first()).toBeVisible();
});

test("Shift alone does not enter keyboard-only or event jump", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await createTimedEventOnGrid(page, "Hold Not Double");

  await page.keyboard.down("Shift");
  await page.waitForTimeout(250);
  await expect(page.locator("[data-shift-event-hints]")).toHaveCount(0);
  await expect(keyboardOnlyIndicator(page)).toHaveCount(0);
  await page.keyboard.up("Shift");
  await expect(page.locator("[data-shift-event-hints]")).toHaveCount(0);
  await expect(keyboardOnlyIndicator(page)).toHaveCount(0);
});
