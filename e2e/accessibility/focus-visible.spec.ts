import { expect, test } from "@playwright/test";
import {
  ensureSidebarOpen,
  prepareCalendarPage,
} from "../utils/event-test-utils";

// Regression guard for "feat(web): ensure all focus areas have visible
// feedback". The "i" shortcut used to move focus into the sidebar with no
// visible indicator (it landed on a month-nav chevron that had no focus
// style, and a global outline reset stripped the fallback). It now lands on
// the month picker's tab-stoppable day, which shows an accent focus ring.
test("the 'i' shortcut moves focus to a visibly-focused sidebar day", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);

  // A real (trusted) keypress so :focus-visible resolves as it would for a
  // keyboard user, and so the app's keyup shortcut handler fires.
  await page.locator("#mainGrid").focus();
  await page.keyboard.press("i");

  const focused = page.locator(".react-datepicker__day:focus");
  await expect(focused).toBeVisible();
  await expect(focused).toHaveClass(/react-datepicker__day/);

  // The landing element must actually paint a focus indicator, not just hold
  // focus. In Week view the picker moves by week rows, so the outline sits on
  // the focused day's week row; Day view outlines the day itself. Other focus
  // targets use a ring (box-shadow) — accept any so the assertion tracks
  // "is it visible".
  const readIndicator = (el: Element) => {
    const s = getComputedStyle(el);
    const row = el.closest(".react-datepicker__week");
    const rowOutline = row ? getComputedStyle(row).outlineStyle : "none";
    const rowAfterShadow = row
      ? getComputedStyle(row, "::after").boxShadow
      : "none";
    return {
      matchesFocusVisible: el.matches(":focus-visible"),
      painted:
        s.outlineStyle !== "none" ||
        s.boxShadow !== "none" ||
        rowOutline !== "none" ||
        rowAfterShadow !== "none",
    };
  };
  const indicator = await focused.evaluate(readIndicator);
  expect(indicator.matchesFocusVisible).toBe(true);
  expect(indicator.painted).toBe(true);

  // Arrow keys move the cursor from the landing spot (one week row in Week
  // view), and the indicator follows focus to the newly focused day.
  const landedOn = await focused.getAttribute("aria-label");
  await page.keyboard.press("ArrowRight");
  const nextFocused = page.locator(".react-datepicker__day:focus");
  await expect(nextFocused).toBeVisible();
  await expect(nextFocused).not.toHaveAttribute("aria-label", landedOn ?? "");
  const stillVisible = await nextFocused.evaluate(readIndicator);
  expect(stillVisible.painted).toBe(true);
});

test("week-mode month picker draws an inset focus ring on the week row", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);

  await page.locator("#mainGrid").focus();
  await page.keyboard.press("i");

  const focused = page.locator(".react-datepicker__day:focus");
  await expect(focused).toBeVisible();

  const weekRing = await focused.evaluate((el) => {
    const row = el.closest(".react-datepicker__week");
    if (!row) return null;
    const rowStyle = getComputedStyle(row);
    const afterStyle = getComputedStyle(row, "::after");
    return {
      rowOutlineWidth: rowStyle.outlineWidth,
      afterContent: afterStyle.content,
      afterBoxShadow: afterStyle.boxShadow,
    };
  });
  expect(weekRing).not.toBeNull();
  expect(weekRing?.rowOutlineWidth).toBe("0px");
  expect(weekRing?.afterContent).not.toBe("none");
  expect(weekRing?.afterBoxShadow).not.toBe("none");

  await page.keyboard.press("ArrowDown");
  const nextFocused = page.locator(".react-datepicker__day:focus");
  await expect(nextFocused).toBeVisible();

  const middleWeekRing = await nextFocused.evaluate((el) => {
    const row = el.closest(".react-datepicker__week");
    if (!row) return null;
    const afterStyle = getComputedStyle(row, "::after");
    return afterStyle.boxShadow;
  });
  expect(middleWeekRing).not.toBe("none");
});
