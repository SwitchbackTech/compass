import { expect, test } from "@playwright/test";

// Empty storage so Welcome + Start Now launch the Shortcut Showcase.
test.use({ storageState: { cookies: [], origins: [] } });
test.use({ viewport: { width: 1600, height: 900 } });

test("Start Now runs the Shortcut Showcase happy path", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await expect(welcomeDialog).toBeVisible();
  await welcomeDialog.getByRole("button", { name: "Start Now" }).click();
  await expect(welcomeDialog).toBeHidden();

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create with the keyboard");

  await page.keyboard.press("c");
  await expect(showcase).toContainText("Name it and save");

  // The practice title editor autofocuses; Enter commits it.
  await page.keyboard.type("Practice Event");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Move between events");
  await expect(showcase).toContainText("Practice Event");

  // The saved draft sits on the middle day; ArrowLeft lands on Monday.
  await page.keyboard.press("ArrowLeft");
  await expect(showcase).toContainText("Jump straight to a field");

  await page.keyboard.press("e");
  await page.keyboard.press("t");
  await expect(showcase).toContainText("Jump to any event");

  // S flashes the real day-prefix chips; t1 is Tuesday's first block.
  await page.keyboard.press("s");
  await page.keyboard.press("t");
  await page.keyboard.press("1");
  await expect(showcase).toContainText("Reschedule in a keystroke");

  await page.keyboard.press("Shift+ArrowDown");
  await expect(showcase).toContainText("Stretch the end time");

  // The step seeds edge focus to start, so one Tab reaches the end edge.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(showcase).toContainText("Place a block anywhere");

  // The step clears focus on entry, so Shift+Arrow drops a fresh block.
  await page.keyboard.press("Shift+ArrowRight");
  await expect(showcase).toContainText("Never stress a mistake");

  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(showcase).toContainText("Try Hardcore Mode");

  await page.keyboard.press("h");
  await expect(showcase).toContainText("young cap'n");

  await page.keyboard.press("Enter");
  await expect(showcase).toHaveCount(0);

  // Graduation lands on the real calendar: seeded events + the checklist.
  await expect(
    page.getByRole("complementary", { name: "Shortcut practice checklist" }),
  ).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toHaveCount(0);
});

test("Skipping the showcase confirms once and never auto-replays", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await welcomeDialog.getByRole("button", { name: "Start Now" }).click();

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create with the keyboard");

  await page.keyboard.press("Escape");
  await expect(showcase).toContainText("Skip the shortcuts?");
  await showcase.getByRole("button", { name: "Skip anyway" }).click();
  await expect(showcase).toHaveCount(0);

  // Skipping still reveals the practice checklist in the real app.
  await expect(
    page.getByRole("complementary", { name: "Shortcut practice checklist" }),
  ).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toHaveCount(0);
  await expect(welcomeDialog).toBeHidden();
});
