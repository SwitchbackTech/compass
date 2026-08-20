import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  openTimedEventFormWithMouse,
} from "../utils/event-test-utils";

// Most E2E coverage skips onboarding to keep the calendar tests focused. This
// spec deliberately starts with empty browser storage so a new user's path is
// exercised end to end. Shortcut Showcase itself is covered in
// shortcut-showcase.spec.ts — here the no-account path is the focus, so
// sample events and create persistence get the attention.
test.use({ storageState: { cookies: [], origins: [] } });
test.use({ viewport: { width: 1600, height: 900 } });

test("welcomes a first-time user and seeds sample events", async ({
  page,
}, testInfo) => {
  // The added first-event-prompt assertions wait out its 4s celebration
  // before the reload, on top of the seeding + create + reload this test
  // already did.
  testInfo.setTimeout(45_000);
  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await expect(welcomeDialog).toBeVisible();

  await welcomeDialog
    .getByRole("button", { name: "Explore without an account" })
    .click();
  await expect(welcomeDialog).toBeHidden();

  // Nothing stands between the welcome screen and the calendar any more.
  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toHaveCount(0);

  await expect(
    page.getByText(/Sample events to help you explore/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Sample Timed event: Try Compass/i }),
  ).toBeVisible();

  // The contextual handoff from practice to the real product: it appears
  // whether or not the user ever ran the showcase itself.
  const prompt = page.getByRole("complementary", {
    name: "Create your first event",
  });
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText("You've got the skills");

  const title = createEventTitle("First-run event");
  await openTimedEventFormWithMouse(page);
  await fillTitleAndSaveEventForm(page, title);

  // The prompt celebrates the first real event, then retires.
  await expect(prompt).toContainText("That's a real one.");
  await expect(prompt).toBeHidden();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(welcomeDialog).toBeHidden();
  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toHaveCount(0);
  await expectTimedEventVisible(page, title);
  // Completion persisted across the reload; the prompt does not come back.
  await expect(
    page.getByRole("complementary", { name: "Create your first event" }),
  ).toHaveCount(0);
});
