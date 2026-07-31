import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  expectTimedEventVisible,
  fillTitleAndSaveEventForm,
  openTimedEventFormWithMouse,
} from "../utils/event-test-utils";

// Most E2E coverage skips onboarding to keep the calendar tests focused. This
// spec deliberately starts with empty browser storage so a new user's path is
// exercised end to end.
test.use({ storageState: { cookies: [], origins: [] } });
test.use({ viewport: { width: 1600, height: 900 } });

test("welcomes a first-time user and seeds sample events", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await expect(welcomeDialog).toBeVisible();

  await welcomeDialog.getByRole("button", { name: "Start Now" }).click();
  await expect(welcomeDialog).toBeHidden();

  await expect(
    page.getByText(/Sample events to help you explore/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Sample Timed event: Try Compass/i }),
  ).toBeVisible();

  const title = createEventTitle("First-run event");
  await openTimedEventFormWithMouse(page);
  await fillTitleAndSaveEventForm(page, title);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(welcomeDialog).toBeHidden();
  await expectTimedEventVisible(page, title);
});
