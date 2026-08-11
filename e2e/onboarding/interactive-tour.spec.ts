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

  // Act 1: create, save, moveFocus, editSequence.
  await page.keyboard.press("c");
  await expect(card).toContainText("Name it and save");

  const title = createEventTitle("Tour Event");
  await fillTitleAndSaveEventForm(page, title);
  await expect(card).toContainText("Move between events");

  // moveFocus auto-focuses today's seeded Morning standup event; today has
  // several other seeded events, so an arrow key has somewhere real to go.
  await page.keyboard.press("ArrowDown");
  await expect(card).toContainText("Jump straight to a field");

  await page.keyboard.press("e");
  await page.keyboard.press("t");
  await expect(card).toContainText("That's the basics");

  await card.getByRole("button", { name: "Keep going" }).click();
  await expect(card).toContainText("Jump to Dentist");

  // Act 2: targetEvent, move, resizeEdge, placeDraft, undo. The exact
  // Shift-hold jump key is covered by e2e/timed/shift-hold-event-hints.spec.ts;
  // here we drive the mission's actual completion signal (Dentist focused),
  // same as a jump would leave it.
  const dentistButton = page
    .locator("#mainGrid")
    .getByRole("button", { name: /Dentist/ });
  await dentistButton.focus();
  await expect(card).toContainText("Move Dentist out of the overlap");

  await page.keyboard.press("Shift+ArrowRight");
  await expect(card).toContainText("Give Dentist more time");

  // A single Tab reaches the end edge (the step seeds edge focus to start).
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(card).toContainText("Place a new event on the grid");

  // The step blurs focus on entry, so nothing is focused for the place-draft
  // Shift+Arrow to move.
  await page.keyboard.press("Shift+ArrowRight");
  await expect(card).toContainText("Never stress about a mistake");

  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(card).toContainText("Graduate to Hardcore Mode");

  // Act 3: hardcore graduation, the tour's finale.
  await page.keyboard.down("Shift");
  await page.keyboard.up("Shift");
  await page.keyboard.down("Shift");
  await page.keyboard.up("Shift");
  await expect(card).toHaveCount(0);

  // Leave Hardcore Mode so it doesn't affect other assertions/reload below.
  await page.keyboard.down("Shift");
  await page.keyboard.up("Shift");
  await page.keyboard.down("Shift");
  await page.keyboard.up("Shift");

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
