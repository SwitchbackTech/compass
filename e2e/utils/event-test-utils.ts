import { expect, type Locator, type Page } from "@playwright/test";

type SomedaySection = "week" | "month";

const LOCAL_DB_NAME = "compass-local";

export const getSavedEventsByTitle = (page: Page, title: string) =>
  page.evaluate(async (eventTitle) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("compass-local");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    try {
      return await new Promise<
        { endDate?: string; startDate?: string; title?: string }[]
      >((resolve, reject) => {
        const transaction = db.transaction("events", "readonly");
        const request = transaction.objectStore("events").getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          resolve(
            request.result.filter(
              (event: { title?: string }) => event.title === eventTitle,
            ),
          );
        };
      });
    } finally {
      db.close();
    }
  }, title);

/** Rendered week day-label dates in column order, as local YYYY-MM-DD. */
export const getVisibleDayDates = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("#weekGridScroller [title]")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => node.title)
      // Day labels use the compact YYYYMMDD title format; skips e.g. the now line
      .filter((title) => /^\d{8}$/.test(title))
      .map(
        (title) =>
          `${title.slice(0, 4)}-${title.slice(4, 6)}-${title.slice(6, 8)}`,
      ),
  );

// Shared timeout for form operations - use a single reasonable timeout instead of short retries
const FORM_TIMEOUT = 10000;

/**
 * Dispatch a keyboard shortcut to the document.
 * Uses the same event properties as the app's internal pressKey utility.
 */
const pressShortcut = async (page: Page, key: string) => {
  await page.evaluate((shortcut) => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: shortcut,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: shortcut,
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
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
  await page.waitForURL((url) => url.pathname.startsWith("/week"), {
    timeout: 10000,
  });

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

const waitForCalendarShell = async (page: Page) => {
  await page
    .getByRole("button", { name: /select view, currently/i })
    .first()
    .waitFor({
      state: "visible",
      timeout: 15000,
    });
};

const clearClientAuthState = async (page: Page) => {
  await page.evaluate(() => {
    localStorage.removeItem("compass.auth");
  });
};

export const createEventTitle = (prefix: string) =>
  `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const updateEventTitle = (prefix: string) =>
  `${prefix} Updated ${Date.now()}`;

export const prepareCalendarPage = async (page: Page) => {
  await page.goto("/week", { waitUntil: "domcontentloaded" });
  await waitForCalendarShell(page);
  await clearClientAuthState(page);

  await resetLocalEventDb(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForCalendarShell(page);

  await ensureWeekView(page);
  await page.locator("#mainGrid").waitFor({ state: "visible", timeout: 15000 });
  await blurActiveElement(page);
  await page.locator("#mainGrid").focus();
};

export const resetLocalEventDb = async (page: Page) => {
  await page.evaluate(async (dbName) => {
    const clearStore = async (
      db: IDBDatabase,
      storeName: string,
    ): Promise<void> => {
      if (!db.objectStoreNames.contains(storeName)) {
        return;
      }

      await new Promise<void>((resolve) => {
        const transaction = db.transaction(storeName, "readwrite");
        const clearRequest = transaction.objectStore(storeName).clear();
        clearRequest.onerror = () => resolve();
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
        transaction.onabort = () => resolve();
      });
    };

    await new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(dbName);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
      deleteRequest.onblocked = () => {
        // If the app still has an open connection, fall back to clearing stores
        // so tests still start from a clean state.
        const openRequest = indexedDB.open(dbName);
        openRequest.onerror = () => resolve();
        openRequest.onsuccess = async () => {
          const db = openRequest.result;
          await clearStore(db, "events");
          await clearStore(db, "tasks");
          db.close();
          resolve();
        };
      };
    });
  }, LOCAL_DB_NAME);
};

// The content pane transitions width over 200ms when the sidebar toggles
// (see WeekView.tsx's `transition-[width]` wrapper), so #mainGrid's column
// layout keeps changing for a beat after the sidebar becomes visible. Poll
// until its measured width stops moving so callers don't compute click/drag
// targets against a mid-transition column count.
const waitForMainGridWidthToSettle = async (page: Page) => {
  const mainGrid = page.locator("#mainGrid");
  const getWidth = () =>
    mainGrid.evaluate((el) => el.getBoundingClientRect().width);

  let previousWidth = await getWidth();

  for (let attempt = 0; attempt < 20; attempt++) {
    await page.waitForTimeout(50);
    const width = await getWidth();
    if (width === previousWidth) {
      return;
    }
    previousWidth = width;
  }
};

export const ensureSidebarOpen = async (page: Page) => {
  const sidebar = page.locator("#sidebar");
  if (!(await sidebar.isVisible())) {
    await blurActiveElement(page);
    await page.locator("#mainGrid").focus();
    await pressShortcut(page, "[");
    await expect(sidebar).toBeVisible();
    await waitForMainGridWidthToSettle(page);
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

export const getMainGridPoint = async (
  page: Page,
  { xRatio = 0.3, yRatio = 0.3 } = {},
) => {
  const mainGrid = page.locator("#mainGrid");
  await mainGrid.scrollIntoViewIfNeeded();
  const box = await mainGrid.boundingBox();

  if (!box) {
    throw new Error("Expected the week grid to be visible.");
  }

  return {
    x: box.x + box.width * xRatio,
    y: box.y + box.height * yRatio,
  };
};

/**
 * Fills the event form title and submits via the Save control (role=button, name Save).
 * Keyboard shortcuts for submit (Enter / Mod+Enter) are not driven here: Playwright’s
 * synthesized keyboard events are unreliable in headless Chromium on Linux CI; the Save
 * button matches the accessible UI and stays stable. Shortcut submit is covered in
 * EventForm unit tests.
 */
export const fillTitleAndSaveEventForm = async (page: Page, title: string) => {
  const titleInput = getFormTitleInput(page);
  await expect(titleInput).toBeVisible({ timeout: FORM_TIMEOUT });
  await titleInput.fill(title);
  const saveButton = page.getByRole("form").getByRole("button", {
    name: "Save",
  });
  // Save often sits in floating form UI that can re-render while Playwright is
  // performing pointer actionability checks. Dispatch a DOM click so React
  // handlers run against the currently mounted control.
  await saveButton.evaluate((el) => {
    (el as HTMLElement).click();
  });
  await titleInput.waitFor({ state: "hidden", timeout: FORM_TIMEOUT });
};

export const openTimedEventFormWithMouse = async (page: Page) => {
  const titleInput = getFormTitleInput(page);

  if (!(await titleInput.isVisible().catch(() => false))) {
    const { x, y } = await getMainGridPoint(page);
    await page.mouse.click(x, y);
  }

  await titleInput.waitFor({ state: "visible", timeout: FORM_TIMEOUT });
};

export const openAllDayEventFormWithMouse = async (page: Page) => {
  await clickGridCenter(page, page.locator("#allDayRow"));
  await getFormTitleInput(page).waitFor({
    state: "visible",
    timeout: FORM_TIMEOUT,
  });
};

export const openSomedayEventFormWithMouse = async (
  page: Page,
  section: SomedaySection,
) => {
  await ensureSidebarOpen(page);
  const addButtonName =
    section === "week" ? "Add item to week" : "Add item to month";
  await page
    .locator("#sidebar")
    .getByRole("button", { name: addButtonName })
    .click();
};

export const openEventForEditingWithMouse = async (
  page: Page,
  eventTitle: string,
) => {
  const titleInput = getFormTitleInput(page);
  const eventButton = page.getByRole("button", { name: eventTitle }).last();

  await eventButton.waitFor({ state: "visible", timeout: FORM_TIMEOUT });
  await eventButton.click({ force: true });
  await expect(titleInput).toHaveValue(eventTitle, { timeout: FORM_TIMEOUT });
};

export const openSomedayEventForEditingWithMouse = async (
  page: Page,
  eventTitle: string,
) => {
  await ensureSidebarOpen(page);

  const titleInput = getFormTitleInput(page);
  const eventButton = page
    .locator("#sidebar")
    .getByRole("button", { name: eventTitle })
    .last();

  await eventButton.waitFor({ state: "visible", timeout: FORM_TIMEOUT });
  await eventButton.scrollIntoViewIfNeeded();
  await eventButton.click();
  await expect(titleInput).toHaveValue(eventTitle, { timeout: FORM_TIMEOUT });
};

export const deleteEventWithMouse = async (page: Page) => {
  const form = page.getByRole("form");
  await expect(form).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await form.getByLabel("Open actions menu").click();
  await page.getByRole("menuitem", { name: /delete/i }).click();
};

export const expectTimedEventVisible = async (page: Page, title: string) => {
  await expect(
    page.locator("#mainGrid").getByRole("button", { name: title }),
  ).toBeVisible({ timeout: 8000 });
};

export const expectAllDayEventVisible = async (page: Page, title: string) => {
  await expect(
    page.locator("#allDayRow").getByRole("button", { name: title }),
  ).toBeVisible({ timeout: 8000 });
};

export const expectSomedayEventVisible = async (page: Page, title: string) => {
  await ensureSidebarOpen(page);
  await expect(
    page.locator("#sidebar").getByRole("button", { name: title }),
  ).toBeVisible({ timeout: 8000 });
};

export const expectTimedEventMissing = async (page: Page, title: string) => {
  await expect(
    page.locator("#mainGrid").getByRole("button", { name: title }),
  ).toHaveCount(0, { timeout: 8000 });
};

export const expectSomedayEventMissing = async (page: Page, title: string) => {
  await ensureSidebarOpen(page);
  await expect(
    page.locator("#sidebar").getByRole("button", { name: title }),
  ).toHaveCount(0, { timeout: 8000 });
};
