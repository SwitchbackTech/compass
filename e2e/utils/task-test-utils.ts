import { type Page, expect } from "@playwright/test";
import { resetLocalEventDb } from "./event-test-utils";

export const prepareTaskPage = async (page: Page) => {
  await page.goto("/day", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("compass.auth");
  });
  await page.waitForURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
  await page.waitForFunction(
    () => {
      const root = document.querySelector("#root");
      return root && root.children.length > 0;
    },
    { timeout: 10000 },
  );

  await resetLocalEventDb(page);
  await page.reload({ waitUntil: "domcontentloaded" });
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
  await expect(
    page.getByRole("textbox", { name: `Edit ${title}` }),
  ).toBeVisible({
    timeout,
  });
};

export const expectTaskMissing = async (
  page: Page,
  title: string,
  timeout = 10000,
) => {
  await expect(
    page.getByRole("textbox", { name: `Edit ${title}` }),
  ).toHaveCount(0, {
    timeout,
  });
};

export const deleteTaskWithKeyboard = async (page: Page, title: string) => {
  const taskCheckbox = page.getByRole("checkbox", {
    name: `Toggle ${title}`,
  });

  await expect(taskCheckbox).toBeVisible();
  await taskCheckbox.focus();
  await page.keyboard.press("Delete");
};

export const restoreDeletedTaskFromUndoToast = async (page: Page) => {
  const undoDeleteText = page.getByText("Deleted").first();

  await expect(undoDeleteText).toBeVisible();
  await undoDeleteText.click();
  await page.keyboard.press("Meta+z");
  await page.keyboard.press("Control+z");
};

export const expectTaskSavedToIndexedDB = async (page: Page, title: string) => {
  const currentDateKey = page.url().split("/").pop() ?? "";

  await page.waitForFunction(
    async ([taskTitle, dateKey]) =>
      new Promise<boolean>((resolve) => {
        const openRequest = indexedDB.open("compass-local");
        openRequest.onerror = () => resolve(false);
        openRequest.onsuccess = () => {
          const db = openRequest.result;

          let transaction: IDBTransaction;
          try {
            transaction = db.transaction("tasks", "readonly");
          } catch {
            db.close();
            resolve(false);
            return;
          }

          const getAllRequest = transaction.objectStore("tasks").getAll();
          getAllRequest.onerror = () => {
            db.close();
            resolve(false);
          };
          getAllRequest.onsuccess = () => {
            const tasks = getAllRequest.result as Array<{
              title?: string;
              dateKey?: string;
            }>;
            db.close();
            resolve(
              tasks.some(
                (task) => task.title === taskTitle && task.dateKey === dateKey,
              ),
            );
          };
        };
      }),
    [title, currentDateKey] as [string, string],
    { timeout: 5000 },
  );
};

export const clearAllLocalData = async (page: Page) => {
  await resetLocalEventDb(page);
  await page.reload();
  await expect(page.locator('[aria-label="daily-tasks"]')).toBeVisible();
};
