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
  await expect(showcase).toContainText("young cap'n");
  await expect(showcase).toContainText("Practice Event");

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

test("Skip to sign up leaves the showcase for the signup form on step 1", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await welcomeDialog.getByRole("button", { name: "Start Now" }).click();

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create with the keyboard");

  // One click, from the first step, with no lesson finished and no confirm.
  await showcase.getByRole("button", { name: "Skip to sign up" }).click();
  await expect(showcase).toHaveCount(0);
  await expect(page).toHaveURL(/auth=signup/);
});

test("Skipping the showcase never auto-replays", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });

  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await welcomeDialog.getByRole("button", { name: "Start Now" }).click();

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create with the keyboard");

  await page.keyboard.press("Escape");
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
