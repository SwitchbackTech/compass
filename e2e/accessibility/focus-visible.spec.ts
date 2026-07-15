import { expect, test } from "@playwright/test";
import {
  ensureSidebarOpen,
  prepareCalendarPage,
} from "../utils/event-test-utils";

// Regression guard for "feat(web): ensure all focus areas have visible
// feedback". The "u" shortcut used to move focus into the sidebar with no
// visible indicator (it landed on a month-nav chevron that had no focus
// style, and a global outline reset stripped the fallback). It now lands on
// the month picker's tab-stoppable day, which shows an accent focus ring.
test("the 'u' shortcut moves focus to a visibly-focused sidebar day", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);

  // A real (trusted) keypress so :focus-visible resolves as it would for a
  // keyboard user, and so the app's keyup shortcut handler fires.
  await page.locator("#mainGrid").focus();
  await page.keyboard.press("u");

  const focused = page.locator(".react-datepicker__day:focus");
  await expect(focused).toBeVisible();
  await expect(focused).toHaveClass(/react-datepicker__day/);

  // The landing element must actually paint a focus indicator, not just hold
  // focus. The datepicker day uses an outline; other focus targets use a ring
  // (box-shadow) — accept either so the assertion tracks "is it visible".
  const indicator = await focused.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      matchesFocusVisible: el.matches(":focus-visible"),
      outlineStyle: s.outlineStyle,
      boxShadow: s.boxShadow,
    };
  });
  expect(indicator.matchesFocusVisible).toBe(true);
  expect(
    indicator.outlineStyle !== "none" || indicator.boxShadow !== "none",
  ).toBe(true);

  // Arrow keys navigate dates from the landing spot, and the indicator
  // follows focus to the newly selected day.
  await page.keyboard.press("ArrowRight");
  const nextFocused = page.locator(".react-datepicker__day:focus");
  await expect(nextFocused).toBeVisible();
  const stillVisible = await nextFocused.evaluate(
    (el) => getComputedStyle(el).outlineStyle !== "none",
  );
  expect(stillVisible).toBe(true);
});
