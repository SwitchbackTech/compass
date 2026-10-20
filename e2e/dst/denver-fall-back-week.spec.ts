import { expect, test } from "@playwright/test";
import {
  fillTitleAndSaveEventForm,
  getVisibleDayDates,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

test.describe("Denver browser fall-back week", () => {
  test.use({
    timezoneId: "America/Denver",
    viewport: { width: 1600, height: 900 },
  });

  test("renders the Nov 2026 fall-back week with 25 hour slots", async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(60_000);
    await page.clock.install({ time: new Date("2026-11-03T09:00:00-07:00") });
    await prepareCalendarPage(page);
    await page.goto("/week/2026-11-01", { waitUntil: "domcontentloaded" });
    await page.locator("#mainGrid").waitFor({ state: "visible" });

    await expect.poll(() => getVisibleDayDates(page)).toContain("2026-11-01");

    await openTimedEventFormWithKeyboard(page);
    const form = page.getByRole("form");
    await page.locator('input[title="Pick Start Date"]').fill("2026-11-05");
    await form.getByRole("combobox", { name: "Start time" }).fill("4:00 AM");
    await form.getByRole("combobox", { name: "End time" }).fill("5:00 AM");
    await fillTitleAndSaveEventForm(page, "~ Wake");

    await expect(
      page.locator("#timedEvents").getByRole("button", { name: /Wake/i }),
    ).toBeVisible();

    await page.locator("#mainGrid").evaluate((grid) => {
      const slotHeight = grid.clientHeight / 13;
      grid.scrollTop = slotHeight * 2.5;
    });

    await page.locator("#mainGrid").screenshot({
      path: "/opt/cursor/artifacts/dst-nov-week.png",
    });

    const slots = await page
      .locator("#mainGrid")
      .evaluate((grid) =>
        getComputedStyle(grid)
          .getPropertyValue("--calendar-day-hour-slots")
          .trim(),
      );
    expect(slots).toBe("25");
    await expect(
      page.getByRole("button", { name: "Calendar timezone" }),
    ).toContainText("MST");
  });
});
