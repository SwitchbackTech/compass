import { expect, type Page, test } from "@playwright/test";

// Empty storage so the welcome modal runs, and the practice has not been seen.
test.use({ storageState: { cookies: [], origins: [] } });
test.use({ viewport: { width: 1600, height: 900 } });

const leaveWelcome = async (page: Page) => {
  const welcomeDialog = page.getByRole("dialog", {
    name: "Welcome to Compass Calendar",
  });
  await expect(welcomeDialog).toBeVisible();
  await expect(
    welcomeDialog.getByRole("button", { name: "Explore without an account" }),
  ).toBeVisible();
  await page.keyboard.press("s");
  await expect(welcomeDialog).toBeHidden();
};

test("exploring without an account starts the practice", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toBeVisible();
});

test("the welcome-started practice runs create then D through graduation", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Drop an event on the board");
  await expect(showcase).toContainText("Press C to start a new event.");
  await expect(showcase).toContainText("Mission 1 of 6");

  await page.keyboard.press("c");
  await expect(showcase).toContainText("Type a title, then press Enter");

  await page.keyboard.type("Practice Event");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Practice Event");
  await expect(showcase).toContainText("Mission 2 of 6");

  // Compass blocks trusted pointer clicks; D is the assist binding.
  const remainingMissions = [
    "Hold fast — reveal the jump keys",
    "Pick a target",
    "Nudge it into place",
    "Grab the title",
    "When you forget, ask the palette",
  ];
  for (const title of remainingMissions) {
    await expect(showcase).toContainText(title);
    await page.keyboard.press("d");
  }

  await expect(showcase).toContainText("young cap'n");
  await page.keyboard.press("Enter");
  await expect(showcase).toHaveCount(0);

  await expect(
    page.getByRole("complementary", { name: "Create your first event" }),
  ).toBeVisible();
});

test("Skip to sign up leaves the practice for the signup form on step 1", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Drop an event on the board");

  await expect(
    showcase.getByRole("button", { name: /Skip to sign up/ }),
  ).toBeVisible();
  await page.keyboard.press("u");
  await expect(showcase).toHaveCount(0);
  await expect(page).toHaveURL(/auth=signup/);
});

test("Escape leaves the practice and it never auto-replays", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Drop an event on the board");

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
