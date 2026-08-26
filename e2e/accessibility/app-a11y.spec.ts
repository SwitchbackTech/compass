import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "../utils/axe-assertion";
import {
  createEventTitle,
  ensureSidebarOpen,
  fillTitleAndSaveEventForm,
  openAllDayEventFormWithKeyboard,
  openEventForEditingWithKeyboard,
  openTimedEventFormWithKeyboard,
  prepareCalendarPage,
} from "../utils/event-test-utils";

// A small, representative smoke suite rather than a bespoke scan per
// component - see "How Axe Coverage Works" in
// docs/development/testing-playbook.md. Each checkpoint reveals or hides a
// distinct UI state (dialogs/menus/errors don't exist until activated), so
// each gets its own scan instead of relying on one page-load scan to cover
// everything.

test("week view renders with no automatically detectable accessibility violations", async ({
  page,
}) => {
  await prepareCalendarPage(page);
  await ensureSidebarOpen(page);

  await expectNoAxeViolations(page, { checkpoint: "week view" });
});

test("the timed event form is accessible when open", async ({ page }) => {
  await prepareCalendarPage(page);
  await openTimedEventFormWithKeyboard(page);

  await expectNoAxeViolations(page, { checkpoint: "timed event form open" });
});

test("the all-day event form is accessible when open", async ({ page }) => {
  await prepareCalendarPage(page);
  await openAllDayEventFormWithKeyboard(page);

  await expectNoAxeViolations(page, { checkpoint: "all-day event form open" });
});

test("the event actions menu is accessible when open", async ({ page }) => {
  await prepareCalendarPage(page);
  const title = createEventTitle("A11y Checkpoint");
  await openTimedEventFormWithKeyboard(page);
  await fillTitleAndSaveEventForm(page, title);
  await openEventForEditingWithKeyboard(page, title);

  await page.getByRole("form").getByLabel("Open actions menu").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();

  await expectNoAxeViolations(page, {
    checkpoint: "event actions menu open",
    knownIncomplete: [
      {
        ruleId: "aria-valid-attr-value",
        reason:
          "@floating-ui/react's FloatingPortal renders the menu into a " +
          "separate DOM subtree from its trigger button. axe cannot " +
          "statically confirm the trigger's aria-controls id is reachable " +
          "across that portal boundary, even though the id exists and is " +
          "valid at scan time (confirmed by directly querying the DOM in " +
          "this same open-menu state).",
      },
      {
        ruleId: "aria-hidden-focus",
        reason:
          "@floating-ui/react's FloatingFocusManager brackets portaled " +
          "menu content with aria-hidden focus-guard sentinels and flips " +
          "their tabindex at runtime to trap Tab focus inside the menu. " +
          "Axe's static analysis can't evaluate that runtime toggle; the " +
          "guards are library-owned, not app markup, and the trap is " +
          "covered by @floating-ui/react's own tests.",
      },
    ],
  });
});

test("the invalid-date validation error is accessible", async ({ page }) => {
  await prepareCalendarPage(page);
  await openAllDayEventFormWithKeyboard(page);

  const startDateInput = page.locator('input[title="Pick Start Date"]');
  await startDateInput.fill("not a date");
  await startDateInput.press("Enter");
  await expect(page.getByRole("alert")).toBeVisible();

  await expectNoAxeViolations(page, { checkpoint: "invalid date error toast" });
});
