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

const startLevelOne = async (page: Page) => {
  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Compass is keyboard-only");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Drop an event on the board");
  await expect(showcase).toContainText("Level 1/9");
};

const holdModAndPress = async (page: Page, key: string) => {
  // Linux CI resolves Mod to Control; macOS to Meta. Hold both so the
  // platform-specific hold tracker and the chord check both fire.
  await page.keyboard.down("Control");
  await page.keyboard.down("Meta");
  await page.keyboard.press(key);
  await page.keyboard.up("Meta");
  await page.keyboard.up("Control");
};

const playThroughLevels = async (page: Page) => {
  const showcase = page.getByRole("region", { name: "Shortcut practice" });

  await page.keyboard.press("c");
  await expect(showcase).toContainText("Type a title, then press Enter");
  await page.keyboard.type("Practice Event");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Practice Event");
  await expect(showcase).toContainText("Level 2/9");
  await expect(showcase).toContainText("See where to go: reveal the jump keys");

  await holdModAndPress(page, "1");
  await expect(showcase).toContainText("Pick a target");

  await page.keyboard.press("h");
  await page.keyboard.press("f");
  await expect(showcase).toContainText("Nudge it into place");

  await page.keyboard.press("Shift+ArrowRight");
  await expect(showcase).toContainText("Change just one edge");

  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(showcase).toContainText("Grab the title");

  await page.keyboard.press("e");
  await page.keyboard.press("t");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Delete, then take it back");

  await page.keyboard.press("Delete");
  await holdModAndPress(page, "z");
  await expect(showcase).toContainText("When you forget, ask the palette");

  await holdModAndPress(page, "k");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("The rest lives in the legend");

  await page.keyboard.press("?");
  await expect(
    showcase.getByRole("dialog", { name: "Practice shortcut legend" }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
};

test("exploring without an account starts the practice", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toContainText("Compass is keyboard-only");
});

test("the welcome-started practice runs the taught keys through graduation", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await startLevelOne(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Press C to start a new event.");
  await expect(showcase.getByRole("button", { name: /^Skip$/ })).toBeVisible();
  await expect(showcase).toContainText(
    "C works on this sandbox. Clicks do not start an event.",
  );

  await playThroughLevels(page);

  // Not a level, so it carries no chip; N passes without prompting.
  await expect(showcase).toContainText("Never miss a meeting");
  await expect(showcase).not.toContainText("Level ");
  await page.keyboard.press("n");

  await expect(showcase).toContainText("you've got this");
  await page.keyboard.press("Enter");
  await expect(showcase).toHaveCount(0);

  await expect(
    page.getByRole("complementary", { name: "Create your first event" }),
  ).toBeVisible();
});

test("taking the notifications offer opts in and moves on", async ({
  page,
  context,
}) => {
  // Granted up front so the offer resolves without a real browser prompt,
  // which Playwright cannot click.
  await context.grantPermissions(["notifications"]);
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await startLevelOne(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await playThroughLevels(page);

  await expect(showcase).toContainText("Never miss a meeting");
  await page.keyboard.press("Enter");

  await expect(showcase).toContainText("you've got this");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("compass.notifications.enabled"),
      ),
    )
    .toBe("true");
});

test("Skip to sign up leaves the practice for the signup form on the intro", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Compass is keyboard-only");

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
  await expect(showcase).toContainText("Compass is keyboard-only");

  await page.keyboard.press("Escape");
  await expect(showcase).toBeVisible();
  await expect(showcase).toContainText("Press Esc again to leave practice.");

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

test("reloading mid-practice resumes the same lesson", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await startLevelOne(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await page.keyboard.press("c");
  await page.keyboard.type("Practice Event");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("See where to go: reveal the jump keys");

  await page.reload({ waitUntil: "domcontentloaded" });
  const resumed = page.getByRole("region", { name: "Shortcut practice" });
  await expect(resumed).toBeVisible();
  await expect(resumed).toContainText("See where to go: reveal the jump keys");
  await expect(
    page.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
  ).toBeHidden();
});
