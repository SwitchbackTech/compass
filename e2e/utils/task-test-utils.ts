import { expect, type Page } from "@playwright/test";
import { resetLocalEventDb } from "./event-test-utils";

const getTaskInput = (page: Page, title: string) =>
  page.getByRole("textbox", { name: `Edit ${title}` });

export const prepareTaskPage = async (page: Page) => {
  await page.goto("/day", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("compass.auth");
  });

  await resetLocalEventDb(page);
  await reloadTaskPage(page);
};

export const reloadTaskPage = async (page: Page) => {
  await page.goto("/day", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.locator('[aria-label="daily-tasks"]')).toBeVisible({
    timeout: 15000,
  });
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
  await expect(page.locator('[aria-label="daily-tasks"]')).toBeVisible({
    timeout,
  });
  await expect(getTaskInput(page, title)).toBeVisible({ timeout });
};

export const expectTaskMissing = async (
  page: Page,
  title: string,
  timeout = 10000,
) => {
  await expect(getTaskInput(page, title)).toHaveCount(0, {
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
  const undoDeleteToast = page
    .getByRole("button", { name: /deleted/i })
    .first();

  await expect(undoDeleteToast).toBeVisible();
  await undoDeleteToast.click();
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
  await reloadTaskPage(page);
};
