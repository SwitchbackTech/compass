import { type Locator, type Page, expect } from "@playwright/test";

type SomedaySection = "week" | "month";

const LOCAL_DB_NAME = "compass-local";

const ONBOARDING_STATE = {
  completedSteps: [],
  isCompleted: true,
  isSignupComplete: true,
  isOnboardingSkipped: true,
  isAuthPromptDismissed: true,
};

// Shared timeout for form operations - use a single reasonable timeout instead of short retries
const FORM_TIMEOUT = 10000;

/**
 * Dispatch a keyboard shortcut to the window.
 * Uses the same event properties as the app's internal pressKey utility.
 */
const pressShortcut = async (page: Page, key: string) => {
  await page.evaluate((shortcut) => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: shortcut,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
    window.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: shortcut,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }, key);
};

/**
 * Retry an action until a condition is met.
 * Consolidates the retry pattern used throughout the test utils.
 */
const retryUntil = async (
  page: Page,
  action: () => Promise<void>,
  waitFor: Locator,
  options: { maxAttempts?: number; perAttemptTimeout?: number } = {},
) => {
  const { maxAttempts = 3, perAttemptTimeout = 3000 } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await action();
    try {
      await waitFor.waitFor({ state: "visible", timeout: perAttemptTimeout });
      return;
    } catch {
      if (attempt === maxAttempts - 1) {
        throw new Error(
          `Action failed after ${maxAttempts} attempts. ` +
            `Expected element to be visible: ${waitFor}`,
        );
      }
      await page.waitForTimeout(200);
    }
  }
};

const ensureWeekView = async (page: Page) => {
  const weekViewButton = page.getByRole("button", {
    name: /select view, currently week/i,
  });

  if (await weekViewButton.isVisible()) {
    return;
  }

  const viewButton = page
    .getByRole("button", { name: /select view, currently/i })
    .first();
  await viewButton.waitFor({ state: "visible", timeout: 5000 });
  await viewButton.click();
  await page.getByRole("option", { name: "Week" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 10000 });

  // Verify we actually switched to Week view
  await weekViewButton.waitFor({ state: "visible", timeout: 5000 });
};

const blurActiveElement = async (page: Page) => {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
};

/** Returns a locator for the form's title input */
const getFormTitleInput = (page: Page) =>
  page.getByRole("form").getByPlaceholder("Title");

export const createEventTitle = (prefix: string) => `${prefix} ${Date.now()}`;

export const updateEventTitle = (prefix: string) =>
  `${prefix} Updated ${Date.now()}`;

export const prepareCalendarPage = async (page: Page) => {
  await page.addInitScript((value) => {
    localStorage.setItem("compass.onboarding", JSON.stringify(value));
  }, ONBOARDING_STATE);

  await page.goto("/", { waitUntil: "networkidle" });

  // Wait for React app to mount by checking for root element with content
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return root && root.children.length > 0;
    },
    { timeout: 10000 },
  );

  await resetLocalEventDb(page);
  await page.reload({ waitUntil: "networkidle" });

  // Wait again after reload for React to mount
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return root && root.children.length > 0;
    },
    { timeout: 10000 },
  );

  await ensureWeekView(page);
  await page.locator("#mainGrid").waitFor({ state: "visible", timeout: 15000 });
  await blurActiveElement(page);
  await page.locator("#mainGrid").focus();
};

export const resetLocalEventDb = async (page: Page) => {
  await page.evaluate(async (dbName) => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  }, LOCAL_DB_NAME);
};

export const ensureSidebarOpen = async (page: Page) => {
  const sidebar = page.locator("#sidebar");
  if (!(await sidebar.isVisible())) {
    await blurActiveElement(page);
    await page.locator("#mainGrid").focus();
    await pressShortcut(page, "[");
    await expect(sidebar).toBeVisible();
  }
};

export const clickGridCenter = async (page: Page, locator: Locator) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Expected grid element to be visible for interaction.");
  }

  const x = box.x + box.width * 0.3;
  const y = box.y + box.height * 0.3;

  await page.mouse.move(x, y);
  await page.mouse.down();
  // Allow draft state to settle before mouseup so the form can open reliably.
  await page.waitForTimeout(175);
  await page.mouse.up();
};

export const fillTitleAndSaveWithMouse = async (page: Page, title: string) => {
  const titleInput = getFormTitleInput(page);
  await expect(titleInput).toBeVisible({ timeout: FORM_TIMEOUT });
  await titleInput.fill(title);
  await page.getByRole("form").getByRole("tab", { name: "Save" }).click();
};

export const fillTitleAndSaveWithKeyboard = async (
  page: Page,
  title: string,
) => {
  const titleInput = getFormTitleInput(page);
  await expect(titleInput).toBeVisible({ timeout: FORM_TIMEOUT });
  await titleInput.fill(title);
  await page.keyboard.press("Enter");
};

export const openTimedEventFormWithMouse = async (page: Page) => {
  const draftEvent = page.locator('#mainGrid .active[role="button"]').first();
  await retryUntil(
    page,
    async () => {
      await clickGridCenter(page, page.locator("#mainGrid"));
      if (await draftEvent.isVisible().catch(() => false)) {
        await draftEvent.click({ force: true });
      }
    },
    getFormTitleInput(page),
  );
};

export const openAllDayEventFormWithMouse = async (page: Page) => {
  await retryUntil(
    page,
    () => clickGridCenter(page, page.locator("#allDayRow")),
    getFormTitleInput(page),
  );
};

export const openSomedayEventFormWithMouse = async (
  page: Page,
  section: SomedaySection,
) => {
  await ensureSidebarOpen(page);
  const plusButtons = page
    .locator("#sidebar")
    .getByRole("button", { name: "+" });
  const targetIndex = section === "week" ? 0 : 1;
  await plusButtons.nth(targetIndex).click();
};

export const openTimedEventFormWithKeyboard = async (page: Page) => {
  await retryUntil(
    page,
    async () => {
      await blurActiveElement(page);
      await page.locator("#mainGrid").focus();
      await pressShortcut(page, "c");
    },
    getFormTitleInput(page),
  );
};

export const openAllDayEventFormWithKeyboard = async (page: Page) => {
  await retryUntil(
    page,
    async () => {
      await blurActiveElement(page);
      await page.locator("#mainGrid").focus();
      await pressShortcut(page, "a");
    },
    getFormTitleInput(page),
  );
};

export const openSomedayEventFormWithKeyboard = async (page: Page) => {
  await blurActiveElement(page);
  await ensureSidebarOpen(page);
  await pressShortcut(page, "w");
  // Wait for form to open
  await getFormTitleInput(page).waitFor({
    state: "visible",
    timeout: FORM_TIMEOUT,
  });
};

export const openEventForEditingWithKeyboard = async (
  page: Page,
  eventTitle: string,
) => {
  const containers = [
    page.locator("#mainGrid"),
    page.locator("#allDayRow"),
    page.locator("#sidebar"),
  ];
  let eventButton: Locator | null = null;
  for (const container of containers) {
    const containerLocator = container
      .locator('[data-event-id][role="button"]')
      .filter({ hasText: eventTitle });
    const containerCount = await containerLocator.count();
    if (containerCount > 0) {
      eventButton = containerLocator.nth(containerCount - 1);
      break;
    }
  }
  if (!eventButton) {
    const activeButton = page.locator(".active", { hasText: eventTitle });
    const sidebarButton = page
      .locator("#sidebar")
      .getByRole("button", { name: eventTitle });
    const allDayButton = page
      .locator("#allDayRow")
      .getByRole("button", { name: eventTitle });
    const timedButton = page
      .locator("#mainGrid")
      .getByRole("button", { name: eventTitle });
    eventButton =
      (await activeButton.count()) > 0
        ? activeButton.first()
        : (await sidebarButton.count()) > 0
          ? sidebarButton.first()
          : (await allDayButton.count()) > 0
            ? allDayButton.last()
            : timedButton.last();
  }
  if (!eventButton) {
    throw new Error(
      `Unable to locate event "${eventTitle}" for keyboard editing.`,
    );
  }
  await eventButton.scrollIntoViewIfNeeded();
  await eventButton.focus();
  const box = await eventButton.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  }
  const titleInput = getFormTitleInput(page);

  await retryUntil(
    page,
    async () => {
      await eventButton.focus();
      await page.keyboard.press("Enter");
      // Also try space if Enter didn't work
      if (!(await titleInput.isVisible().catch(() => false))) {
        await page.keyboard.press(" ");
      }
    },
    titleInput,
    { maxAttempts: 4 },
  );
};

export const openEventForEditingWithMouse = async (
  page: Page,
  eventTitle: string,
) => {
  const activeButton = page.locator(".active", { hasText: eventTitle });
  const eventButton =
    (await activeButton.count()) > 0
      ? activeButton.first()
      : page.getByRole("button", { name: eventTitle }).first();

  await retryUntil(
    page,
    async () => {
      await page.waitForTimeout(200);
      await eventButton.click({ force: true });
    },
    getFormTitleInput(page),
  );
};

export const deleteEventWithMouse = async (page: Page) => {
  const form = page.getByRole("form");
  await expect(form).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await form.getByLabel("Open actions menu").click();
  await page.getByRole("menuitem", { name: /delete/i }).click();
};

export const deleteEventWithKeyboard = async (page: Page) => {
  await getFormTitleInput(page).waitFor({ timeout: FORM_TIMEOUT });
  page.once("dialog", (dialog) => dialog.accept());
  await page.keyboard.press("Delete");
};

export const expectTimedEventVisible = async (page: Page, title: string) =>
  expect(
    page.locator("#mainGrid").getByRole("button", { name: title }),
  ).toBeVisible();

export const expectAllDayEventVisible = async (page: Page, title: string) =>
  expect(
    page.locator("#allDayRow").getByRole("button", { name: title }),
  ).toBeVisible();

export const expectSomedayEventVisible = async (page: Page, title: string) =>
  expect(
    page.locator("#sidebar").getByRole("button", { name: title }),
  ).toBeVisible();

export const expectTimedEventMissing = async (page: Page, title: string) =>
  expect(
    page.locator("#mainGrid").getByRole("button", { name: title }),
  ).toHaveCount(0);

export const expectAllDayEventMissing = async (page: Page, title: string) =>
  expect(
    page.locator("#allDayRow").getByRole("button", { name: title }),
  ).toHaveCount(0);

export const expectSomedayEventMissing = async (page: Page, title: string) =>
  expect(
    page.locator("#sidebar").getByRole("button", { name: title }),
  ).toHaveCount(0);
