import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  getSavedEventsByTitle,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

type CalendarPage = Parameters<typeof prepareCalendarPage>[0];

const DAY_PREFIX_KEYS: Record<string, string[]> = {
  SU: ["s", "u"],
  M: ["m"],
  T: ["t"],
  W: ["w"],
  R: ["r"],
  F: ["f"],
  SA: ["s", "a"],
};

/**
 * Creates a timed event on today via `c`, then nudges it by quarter-hour
 * steps so the trio gets distinct start times for chronological jump
 * indices. Direction flips near midnight so a nudge never leaves the day.
 */
const createTimedEventOffsetBy = async (
  page: CalendarPage,
  title: string,
  quarterHours: number,
) => {
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await expectTimedEventVisible(page, title);
  if (quarterHours === 0) return;

  const [saved] = await getSavedEventsByTitle(page, title);
  const startHour = new Date(saved.startDate).getHours();
  const key = startHour >= 22 ? "Shift+ArrowUp" : "Shift+ArrowDown";

  const eventButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: title });
  await eventButton.focus();
  for (let press = 0; press < quarterHours; press++) {
    await page.keyboard.press(key);
  }
  await expect
    .poll(async () => {
      const [event] = await getSavedEventsByTitle(page, title);
      return event?.startDate !== saved.startDate;
    })
    .toBe(true);
};

const shiftHintOverlay = (page: CalendarPage) =>
  page.locator("[data-shift-event-hints]");

const blurActive = (page: CalendarPage) =>
  page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

test("tap s shows day-prefix jump keys and focuses the assigned event", async ({
  page,
}) => {
  await prepareCalendarPage(page);

  const earlyTitle = createEventTitle("Early Flash");
  const middleTitle = createEventTitle("Middle Flash");
  const lateTitle = createEventTitle("Late Flash");

  // Same day; nudges give distinct start times for chronological indices.
  await createTimedEventOffsetBy(page, earlyTitle, 0);
  await createTimedEventOffsetBy(page, middleTitle, 1);
  await createTimedEventOffsetBy(page, lateTitle, 2);

  // Indices are chronological; the direction near midnight flips which title
  // sits second, so resolve index 2's title from the stored start times.
  const events = await Promise.all(
    [earlyTitle, middleTitle, lateTitle].map(async (title) => {
      const [event] = await getSavedEventsByTitle(page, title);
      return { title, start: event.startDate };
    }),
  );
  const secondTitle = events.sort((a, b) => a.start.localeCompare(b.start))[1]
    .title;
  const secondButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: secondTitle });

  await blurActive(page);
  await page.keyboard.press("s");

  const overlay = shiftHintOverlay(page);
  await expect(overlay.locator(":scope > span")).toHaveCount(3);

  const labels = await overlay.evaluate((root) =>
    [...root.querySelectorAll(":scope > span")].map(
      (node) => node.textContent?.trim() ?? "",
    ),
  );
  const dayPrefix = labels[0]?.replace(/\d+$/, "") ?? "";
  expect(DAY_PREFIX_KEYS[dayPrefix]).toBeTruthy();
  expect([...labels].sort()).toEqual(
    [`${dayPrefix}1`, `${dayPrefix}2`, `${dayPrefix}3`].sort(),
  );

  for (const key of DAY_PREFIX_KEYS[dayPrefix] ?? []) {
    await page.keyboard.down(key);
    await page.keyboard.up(key);
  }
  await page.keyboard.down("2");
  await page.keyboard.up("2");

  await expect(secondButton).toBeFocused();
  // Mode stays on after a digit focus so another index can be typed.
  await expect(shiftHintOverlay(page)).toHaveCount(1);

  await page.keyboard.down("Escape");
  await page.keyboard.up("Escape");
  await expect(shiftHintOverlay(page)).toHaveCount(0);
});

test("Shift+Tab does not toggle event jump keys", async ({ page }) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Chord Quiet");
  await createTimedEventOffsetBy(page, title, 0);
  await blurActive(page);

  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");

  await expect(shiftHintOverlay(page)).toHaveCount(0);
});

test("fast Shift+J does not toggle event jump keys", async ({ page }) => {
  await prepareCalendarPage(page);

  const title = createEventTitle("Chord Quiet J");
  await createTimedEventOffsetBy(page, title, 0);
  await blurActive(page);

  await page.keyboard.down("Shift");
  await page.keyboard.down("j");
  await page.waitForTimeout(250);
  await page.keyboard.up("j");
  await page.keyboard.up("Shift");

  await expect(shiftHintOverlay(page)).toHaveCount(0);
});
