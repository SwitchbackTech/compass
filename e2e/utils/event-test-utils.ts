import { type Locator, type Page, expect } from "@playwright/test";

type SomedaySection = "week" | "month";

const LOCAL_DB_NAME = "compass-local";

const ONBOARDING_STATE = {
  completedSteps: [],
  isSeen: true,
  isCompleted: true,
  isStorageWarningSeen: true,
  isSignupComplete: true,
  isOnboardingSkipped: true,
  isAuthPromptDismissed: true,
};

const pressShortcut = async (page: Page, key: string) => {
  await page.evaluate((shortcut) => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: shortcut, bubbles: true }),
    );
    window.dispatchEvent(
      new KeyboardEvent("keyup", { key: shortcut, bubbles: true }),
    );
  }, key);
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
  await page.waitForTimeout(75);
  await page.mouse.up();
};

export const fillTitleAndSaveWithMouse = async (page: Page, title: string) => {
  const form = page.getByRole("form");
  const titleInput = form.getByPlaceholder("Title");
  await expect(titleInput).toBeVisible();
  await titleInput.fill(title);
  await form.getByRole("tab", { name: "Save" }).click();
};

export const fillTitleAndSaveWithKeyboard = async (
  page: Page,
  title: string,
) => {
  const form = page.getByRole("form");
  const titleInput = form.getByPlaceholder("Title");
  await expect(titleInput).toBeVisible();
  await titleInput.fill(title);
  await page.keyboard.press("Enter");
};

export const openTimedEventFormWithMouse = async (page: Page) => {
  const titleInput = page.getByRole("form").getByPlaceholder("Title");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickGridCenter(page, page.locator("#mainGrid"));
    try {
      await titleInput.waitFor({ state: "visible", timeout: 2500 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(150);
    }
  }
};

export const openAllDayEventFormWithMouse = async (page: Page) => {
  const titleInput = page.getByRole("form").getByPlaceholder("Title");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickGridCenter(page, page.locator("#allDayRow"));
    try {
      await titleInput.waitFor({ state: "visible", timeout: 2500 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(150);
    }
  }
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
  await blurActiveElement(page);
  await page.locator("#mainGrid").focus();
  await pressShortcut(page, "c");
};

export const openAllDayEventFormWithKeyboard = async (page: Page) => {
  await blurActiveElement(page);
  await page.locator("#mainGrid").focus();
  await pressShortcut(page, "a");
};

export const openSomedayEventFormWithKeyboard = async (page: Page) => {
  await blurActiveElement(page);
  await ensureSidebarOpen(page);
  await pressShortcut(page, "w");
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
  const titleInput = page.getByRole("form").getByPlaceholder("Title");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.waitForTimeout(250);
    await eventButton.focus();
    await page.keyboard.press("Enter");
    if (!(await titleInput.isVisible().catch(() => false))) {
      await page.keyboard.press(" ");
    }
    try {
      await titleInput.waitFor({ state: "visible", timeout: 3000 });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      await page.waitForTimeout(150);
    }
  }
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
  const titleInput = page.getByRole("form").getByPlaceholder("Title");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.waitForTimeout(200);
    await eventButton.click({ force: true });
    try {
      await titleInput.waitFor({ state: "visible", timeout: 3000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(150);
    }
  }
};

export const deleteEventWithMouse = async (page: Page) => {
  const form = page.getByRole("form");
  await expect(form).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await form.getByLabel("Open actions menu").click();
  await page.getByRole("menuitem", { name: /delete/i }).click();
};

export const deleteEventWithKeyboard = async (page: Page) => {
  await page.getByRole("form").getByPlaceholder("Title").waitFor();
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
