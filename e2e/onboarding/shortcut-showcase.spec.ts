import { expect, type Page, test } from "@playwright/test";

// Empty storage so the welcome modal runs, and the practice has not been seen.
test.use({ storageState: { cookies: [], origins: [] } });
test.use({ viewport: { width: 1600, height: 900 } });

/**
 * Signing up is the only other way in, and that needs a real backend, so the
 * palette is how e2e reaches the practice arena.
 */
const openPracticeFromPalette = async (page: Page) => {
  await page.keyboard.press("ControlOrMeta+k");
  const search = page.getByLabel("Command palette search");
  await expect(search).toBeVisible();
  await search.fill("Practice shortcuts");
  await page.getByRole("option", { name: /Practice shortcuts/ }).click();
};

const leaveWelcome = async (page: Page) => {
  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await expect(welcomeDialog).toBeVisible();
  await welcomeDialog
    .getByRole("button", { name: "Explore without an account" })
    .click();
  await expect(welcomeDialog).toBeHidden();
};

test("exploring without an account lands on the calendar, not the practice", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  // The takeover is an educational layer for people who committed, so it no
  // longer stands between the welcome screen and the app.
  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Shortcut practice checklist" }),
  ).toBeVisible();
});

test("the palette runs the two-lesson practice happy path", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await openPracticeFromPalette(page);

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
});

test("Skip to sign up leaves the practice for the signup form on step 1", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await openPracticeFromPalette(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create with the keyboard");

  // One click, from the first step, with no lesson finished and no confirm.
  await showcase.getByRole("button", { name: "Skip to sign up" }).click();
  await expect(showcase).toHaveCount(0);
  await expect(page).toHaveURL(/auth=signup/);
});

test("Escape leaves the practice and it never auto-replays", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await openPracticeFromPalette(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create with the keyboard");

  await page.keyboard.press("Escape");
  await expect(showcase).toHaveCount(0);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
  ).toBeHidden();
});
