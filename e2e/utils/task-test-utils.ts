import { type Page, expect } from "@playwright/test";
import { resetLocalEventDb } from "./event-test-utils";

export const prepareTaskPage = async (page: Page) => {
  await page.goto("/day", { waitUntil: "networkidle" });
  await page.waitForURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return root && root.children.length > 0;
    },
    { timeout: 10000 },
  );

  await resetLocalEventDb(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return root && root.children.length > 0;
    },
    { timeout: 10000 },
  );

  // Wait for task list to be visible
  await expect(page.locator('[aria-label="daily-tasks"]')).toBeVisible();
};

export const createTask = async (page: Page, title: string) => {
  // Check if input is already visible
  const input = page.getByPlaceholder("Enter task title...");

  if (!(await input.isVisible())) {
    const addTaskButton = page.getByRole("button", { name: "Create new task" });
    if (await addTaskButton.isVisible()) {
      await addTaskButton.click();
    } else {
      // Try shortcut 'c'
      await page.keyboard.press("c");
    }
  }

  await expect(input).toBeVisible();
  await input.fill(title);
  await input.press("Enter");
};

export const expectTaskVisible = async (
  page: Page,
  title: string,
  timeout = 10000,
) => {
  // Tasks are rendered as inputs
  await expect(page.locator(`input[value="${title}"]`)).toBeVisible({
    timeout,
  });
};

export const expectTaskSavedToIndexedDB = async (page: Page, title: string) => {
  let lastSnapshot: unknown = null;

  for (let attempt = 0; attempt < 20; attempt++) {
    lastSnapshot = await page.evaluate(async () => {
      const currentDateKey = window.location.pathname.split("/").pop() ?? "";

      return await new Promise<{
        openError?: boolean;
        storeError?: string;
        currentDateKey?: string;
        tasks?: Array<{ title: string; dateKey: string }>;
      }>((resolve) => {
        const openRequest = indexedDB.open("compass-local");
        openRequest.onerror = () => resolve({ openError: true });
        openRequest.onsuccess = () => {
          const db = openRequest.result;

          let store;
          try {
            const transaction = db.transaction("tasks", "readonly");
            store = transaction.objectStore("tasks");
          } catch (error) {
            resolve({ storeError: String(error) });
            return;
          }

          const getAllRequest = store.getAll();
          getAllRequest.onerror = () => resolve({ currentDateKey, tasks: [] });
          getAllRequest.onsuccess = () => {
            const tasks = getAllRequest.result as Array<{
              title?: string;
              dateKey?: string;
            }>;
            resolve({
              currentDateKey,
              tasks: tasks
                .filter(
                  (task): task is { title: string; dateKey: string } =>
                    Boolean(task?.title) && Boolean(task?.dateKey),
                )
                .map((task) => ({
                  title: task.title,
                  dateKey: task.dateKey,
                })),
            });
          };
        };
      });
    });

    if (
      typeof lastSnapshot === "object" &&
      lastSnapshot !== null &&
      "tasks" in lastSnapshot
    ) {
      const tasks =
        (
          lastSnapshot as {
            tasks?: Array<{ title: string; dateKey: string }>;
          }
        ).tasks ?? [];
      const currentDateKey =
        (lastSnapshot as { currentDateKey?: string }).currentDateKey ?? "";

      const isTaskSavedForCurrentDate = tasks.some(
        (task) => task.title === title && task.dateKey === currentDateKey,
      );

      if (isTaskSavedForCurrentDate) {
        return;
      }
    }

    await page.waitForTimeout(200);
  }

  throw new Error(
    `Task was not found in IndexedDB after polling: ${JSON.stringify(lastSnapshot)}`,
  );
};

export const clearAllLocalData = async (page: Page) => {
  await resetLocalEventDb(page);
  await page.reload();
  await expect(page.locator('[aria-label="daily-tasks"]')).toBeVisible();
};

/**
 * @deprecated Use clearAllLocalData. This clears the shared local IndexedDB
 * database (both events and tasks).
 */
export const clearTasks = async (page: Page) => {
  await clearAllLocalData(page);
};
