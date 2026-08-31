import { expect, type Page, test } from "@playwright/test";

// Empty storage so the welcome modal runs, and the game has not been seen.
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

const startTheClock = async (page: Page) => {
  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Schedule Rush");
  await expect(
    showcase.getByRole("button", { name: "Start the clock" }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Task 1/10");
};

const holdModAndPress = async (page: Page, key: string) => {
  // Linux CI resolves Mod to Control; macOS to Meta. Hold both so the
  // chord check fires on either platform.
  await page.keyboard.down("Control");
  await page.keyboard.down("Meta");
  await page.keyboard.press(key);
  await page.keyboard.up("Meta");
  await page.keyboard.up("Control");
};

const pressTimes = async (page: Page, key: string, times: number) => {
  for (let i = 0; i < times; i += 1) {
    await page.keyboard.press(key);
  }
};

/** The winning script: clears all ten tasks with the taught keys. */
const clearTheQueue = async (page: Page) => {
  const showcase = page.getByRole("region", { name: "Shortcut practice" });

  // place-standup: C spawns the piece, walk it to Monday, lock.
  await page.keyboard.press("c");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Task 2/10");

  // quicktime-lunch: type the time, lock.
  await page.keyboard.type("1230");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Task 3/10");

  // place-review: two days right, lock.
  await page.keyboard.press("c");
  await pressTimes(page, "ArrowRight", 2);
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Task 4/10");

  // nudge-standup: 9:00 -> 10:00 in 15-minute steps.
  await pressTimes(page, "Shift+ArrowDown", 4);
  await expect(showcase).toContainText("Task 5/10");

  // resize-one-on-one: Tab to the end edge, stretch 10:30 -> 11:00.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await pressTimes(page, "Shift+ArrowDown", 2);
  await expect(showcase).toContainText("Task 6/10");

  // quicktime-focus
  await page.keyboard.type("1600");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Task 7/10");

  // delete-gym, undo-gym
  await page.keyboard.press("Delete");
  await expect(showcase).toContainText("Task 8/10");
  await holdModAndPress(page, "z");
  await expect(showcase).toContainText("Task 9/10");

  // nudge-review: one day left.
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(showcase).toContainText("Task 10/10");

  // place-party: down to 5pm, lock.
  await page.keyboard.press("c");
  await pressTimes(page, "ArrowDown", 4);
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("You cleared the week!");
};

test("exploring without an account offers the game's how-to card", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toBeVisible();
  await expect(showcase).toContainText("Schedule Rush");
  await expect(showcase).toContainText("keyboard-only");
});

test("a full run clears the queue, shows the score, and graduates", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await startTheClock(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase.getByRole("timer")).toBeVisible();
  await expect(showcase.getByRole("button", { name: /^Skip$/ })).toBeVisible();

  await clearTheQueue(page);

  await expect(showcase).toContainText("10/10 tasks cleared");
  await expect(showcase).toContainText("Moves you learned");
  await expect(
    showcase.getByRole("button", { name: /Sign up to keep your calendar/ }),
  ).toBeVisible();

  // O opens the calendar for anonymous players; Enter belongs to signup.
  await page.keyboard.press("o");
  await expect(showcase).toHaveCount(0);

  await expect(
    page.getByRole("complementary", { name: "Create your first event" }),
  ).toBeVisible();
});

test("the end screen's reminders button opts in without leaving", async ({
  page,
  context,
}) => {
  // Granted up front so the offer resolves without a real browser prompt,
  // which Playwright cannot click.
  await context.grantPermissions(["notifications"]);
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await startTheClock(page);
  await clearTheQueue(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(
    showcase.getByRole("button", { name: /Enable reminders/ }),
  ).toBeVisible();
  // Keyboard, not click: pointer events are suppressed app-wide.
  await page.keyboard.press("n");

  await expect(showcase).toContainText("You cleared the week!");
  await expect
    .poll(() =>
      page.evaluate(() =>
        localStorage.getItem("compass.notifications.enabled"),
      ),
    )
    .toBe("true");
});

test("Enter on the end screen hands an anonymous player to signup", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await startTheClock(page);
  await clearTheQueue(page);

  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Shortcut practice" }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/auth=signup/);
});

test("Skip to sign up leaves the game for the signup form", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Schedule Rush");

  await expect(
    showcase.getByRole("button", { name: /Skip to sign up/ }),
  ).toBeVisible();
  await page.keyboard.press("u");
  await expect(showcase).toHaveCount(0);
  await expect(page).toHaveURL(/auth=signup/);
});

test("Escape leaves the game and it never auto-replays", async ({ page }) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await expect(showcase).toContainText("Schedule Rush");

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

test("reloading mid-game re-offers a fresh run from the how-to card", async ({
  page,
}) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await leaveWelcome(page);
  await startTheClock(page);

  const showcase = page.getByRole("region", { name: "Shortcut practice" });
  await page.keyboard.press("c");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(showcase).toContainText("Task 2/10");

  await page.reload({ waitUntil: "domcontentloaded" });
  const resumed = page.getByRole("region", { name: "Shortcut practice" });
  await expect(resumed).toBeVisible();
  // A 90-second run has no mid-run resume: the attempt re-offers whole.
  await expect(resumed).toContainText("Schedule Rush");
  await expect(
    resumed.getByRole("button", { name: "Start the clock" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
  ).toBeHidden();
});
