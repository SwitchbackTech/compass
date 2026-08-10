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
  await expect(card).toContainText("Move between events");

  await page.keyboard.press("ArrowRight");
  await expect(card).toContainText("Jump straight to a field");

  // E then T is the edit sequence; it acts on whichever event has DOM
  // focus. There is only one event on the calendar, so the ArrowRight
  // above (there being no adjacent event to move to) may not have kept
  // focus on it -- refocus it explicitly, mirroring
  // e2e/timed/edit-sequence-title.spec.ts.
  const eventButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: title });
  await eventButton.focus();

  await page.keyboard.press("e");
  await page.keyboard.press("t");
  await expect(card).toContainText("Open the command palette");

  // Close the form the edit sequence opened before testing the palette
  // shortcut, so Escape here closes the form rather than the palette.
  await page.keyboard.press("Escape");

  // Linux CI uses Ctrl; macOS local runs use Meta. Press both modifiers' chord
  // via ControlOrMeta through Playwright's platform-aware ControlOrMeta token.
  await page.keyboard.press("ControlOrMeta+k");
  // Palette stays open with search focused; the tour must not advance to "?" yet.
  await expect(card).toContainText("Open the command palette");
  await page.keyboard.press("Escape");
  await expect(card).toContainText("Browse every shortcut");

  // Shift+/ opens the legend (same as ? on US keyboards) once the calendar has focus.
  await page.keyboard.press("Shift+/");
  await expect(card).toContainText("That's the basics");

  await card.getByRole("button", { name: "I'm done" }).click();
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
