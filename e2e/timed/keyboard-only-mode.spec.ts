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

const tapShift = async (page: CalendarPage) => {
  await page.keyboard.down("Shift");
  await page.keyboard.up("Shift");
};

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

test("SHIFT-SHIFT enters keyboard-only mode; clicks are inert until Escape", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  const eventButton = await createTimedEventOnGrid(
    page,
    "Keyboard Only Target",
  );

  await tapShift(page);
  await tapShift(page);

  await expect(keyboardOnlyIndicator(page)).toContainText("Keyboard only");
  await expect(keyboardOnlyIndicator(page)).toContainText("Esc or Shift Shift");

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

test("SHIFT-SHIFT exits keyboard-only mode and restores clicks", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  const eventButton = await createTimedEventOnGrid(
    page,
    "Keyboard Only Toggle Exit",
  );

  await tapShift(page);
  await tapShift(page);
  await expect(keyboardOnlyIndicator(page)).toBeVisible();

  await tapShift(page);
  await tapShift(page);
  await expect(keyboardOnlyIndicator(page)).toHaveCount(0);

  await eventButton.click();
  await expect(page.getByLabel("Title")).toBeVisible();
});

test("hold Shift still flashes jump keys and does not enter keyboard-only mode", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await createTimedEventOnGrid(page, "Hold Not Double");

  await page.keyboard.down("Shift");
  await page.waitForTimeout(250);
  await expect(page.locator("[data-shift-event-hints]")).toHaveCount(1);
  await expect(keyboardOnlyIndicator(page)).toHaveCount(0);
  await page.keyboard.up("Shift");
  await expect(page.locator("[data-shift-event-hints]")).toHaveCount(0);
  await expect(keyboardOnlyIndicator(page)).toHaveCount(0);
});
