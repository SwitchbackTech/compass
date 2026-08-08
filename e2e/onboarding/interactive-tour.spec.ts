import { expect, test } from "@playwright/test";
import {
  createEventTitle,
  fillTitleAndSaveEventForm,
} from "../utils/event-test-utils";

// Empty storage so Welcome + Start Now launch the interactive tour.
test.use({ storageState: { cookies: [], origins: [] } });
test.use({ viewport: { width: 1600, height: 900 } });

test("Start Now runs the interactive tour happy path", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await expect(welcomeDialog).toBeVisible();
  await welcomeDialog.getByRole("button", { name: "Start Now" }).click();
  await expect(welcomeDialog).toBeHidden();

  const card = page.locator("[data-onboarding-tour]");
  await expect(card).toContainText("Create with the keyboard");

  await page.keyboard.press("c");
  await expect(card).toContainText("Name it and save");

  const title = createEventTitle("Tour Event");
  await fillTitleAndSaveEventForm(page, title);
  await expect(card).toContainText("Open the command palette");

  await page.keyboard.press("Meta+k");
  await expect(card).toContainText("Browse every shortcut");
  await page.keyboard.press("Escape");

  // Shift+/ opens the legend (same as ? on US keyboards).
  await page.keyboard.press("Shift+/");
  await expect(card).toContainText("You are ready");

  await card.getByRole("button", { name: "Finish" }).click();
  await expect(card).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-onboarding-tour]")).toHaveCount(0);
});

test("Skip tour from Start Now never auto-replays", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await welcomeDialog.getByRole("button", { name: "Start Now" }).click();

  const card = page.locator("[data-onboarding-tour]");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Skip tour" }).click();
  await expect(card).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-onboarding-tour]")).toHaveCount(0);
  await expect(welcomeDialog).toBeHidden();
});
