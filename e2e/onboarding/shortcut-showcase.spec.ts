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

test("the welcome-started practice runs the one-lesson happy path", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create an event");
  await expect(showcase).toContainText("Press C to start a new event.");

  await page.keyboard.press("c");
  await expect(showcase).toContainText("Type a title, then press Enter");

  // The practice title editor autofocuses; Enter commits it.
  await page.keyboard.type("Practice Event");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Practice Event");

  // The notifications offer comes between the lesson and the exit. N passes
  // it by, so this path never raises a browser permission prompt.
  await expect(showcase).toContainText("Never miss a meeting");
  await page.keyboard.press("n");

  await expect(showcase).toContainText("young cap'n");

  await page.keyboard.press("Enter");
  await expect(showcase).toHaveCount(0);

  // Graduation lands on the real calendar: seeded events + the handoff to
  // create a real one.
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

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await page.keyboard.press("c");
  await page.keyboard.type("Practice Event");
  await page.keyboard.press("Enter");

  await expect(showcase).toContainText("Never miss a meeting");
  await page.keyboard.press("Enter");

  await expect(showcase).toContainText("young cap'n");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("compass.notifications.enabled"),
      ),
    )
    .toBe("true");
});

test("Skip to sign up leaves the practice for the signup form on step 1", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create an event");

  // One click, from the first step, with no lesson finished and no confirm.
  // The advertised S letter, not a click: the side actions are key-bound.
  await expect(
    showcase.getByRole("button", { name: /Skip to sign up/ }),
  ).toBeVisible();
  await page.keyboard.press("s");
  await expect(showcase).toHaveCount(0);
  await expect(page).toHaveURL(/auth=signup/);
});

test("Escape leaves the practice and it never auto-replays", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Create an event");

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
