import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  deleteEventWithKeyboard,
  fillTitleAndSaveEventForm,
  openAllDayEventFormWithKeyboard,
  openEventForEditingWithKeyboard,
  prepareTimedCalendarPage,
} from "../utils/event-test-utils";

const ALL_DAY_ROW_SPARE_LANE_PX = 22;
const EVENT_ALLDAY_GAP = 3;
const EVENT_ALLDAY_ROW_HEIGHT = 23;

const compactAllDayRowHeightPx = (laneCount: number) => {
  const lanes = Math.max(1, laneCount);
  return (
    2 * EVENT_ALLDAY_GAP +
    lanes * EVENT_ALLDAY_ROW_HEIGHT +
    ALL_DAY_ROW_SPARE_LANE_PX
  );
};

const prepareTeachingWeek = async (page: import("@playwright/test").Page) => {
  await page.addInitScript(() => {
    localStorage.setItem("compass.onboarding.has-seen-welcome", "true");
    localStorage.setItem(
      "compass.onboarding.has-seen-shortcut-showcase",
      "true",
    );
    localStorage.setItem("compass.onboarding.first-event-done", "dismissed");
  });
  await prepareTimedCalendarPage(page);
};

const readAllDayRowHeight = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    Math.round(
      document.getElementById("allDayRow")?.getBoundingClientRect().height ?? 0,
    ),
  );

const pointerHint = (page: import("@playwright/test").Page) =>
  page.locator("[data-pointer-hint]");

test("all-day row height tracks stacked events in compact mode", async ({
  page,
}) => {
  await prepareTeachingWeek(page);

  const titles = [
    createEventTitle("AllDay A"),
    createEventTitle("AllDay B"),
    createEventTitle("AllDay C"),
  ];

  for (const title of titles) {
    await openAllDayEventFormWithKeyboard(page);
    await fillTitleAndSaveEventForm(page, title);
  }

  const threeLaneHeight = compactAllDayRowHeightPx(3);
  await expect.poll(() => readAllDayRowHeight(page)).toBe(threeLaneHeight);

  await openEventForEditingWithKeyboard(page, titles[2]!);
  await deleteEventWithKeyboard(page);

  const twoLaneHeight = compactAllDayRowHeightPx(2);
  await expect.poll(() => readAllDayRowHeight(page)).toBe(twoLaneHeight);
  expect(twoLaneHeight).toBeLessThan(threeLaneHeight);
});

test("empty all-day click teaches Shift+C", async ({ page }) => {
  await prepareTeachingWeek(page);

  await expect(page.locator("#allDayRow")).toHaveClass(/ph-no-rageclick/);

  const clickTarget = await page.evaluate(() => {
    const row = document.getElementById("allDayRow");
    const column = document.querySelector<HTMLElement>(
      "#allDayColumns [data-grid-date]",
    );
    if (!row || !column) {
      throw new Error("missing all-day row markers");
    }
    const rowBox = row.getBoundingClientRect();
    const columnBox = column.getBoundingClientRect();
    return {
      x: columnBox.left + columnBox.width / 2,
      y: rowBox.bottom - 8,
    };
  });

  await page.mouse.click(clickTarget.x, clickTarget.y);

  const hint = pointerHint(page);
  await expect(hint).toBeVisible();
  await expect(hint).toContainText("all-day");
  await expect(hint.getByText("C", { exact: true })).toBeVisible();
  await expect(hint.getByText("Shift", { exact: true })).toBeVisible();
});
