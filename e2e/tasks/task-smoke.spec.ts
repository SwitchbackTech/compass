import { test } from "@playwright/test";
import {
  createTask,
  deleteTaskWithKeyboard,
  expectDeleteToastVisible,
  expectTaskMissing,
  expectTaskSavedToIndexedDB,
  expectTaskVisible,
  prepareTaskPage,
  reloadTaskPage,
} from "../utils/task-test-utils";

test.describe("Task smoke", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Tasks are not available in the current mobile experience.",
  );

  test("creates, persists, and deletes a task", async ({ page }) => {
    await prepareTaskPage(page);

    const taskTitle = `Task Smoke ${Date.now()}`;
    await createTask(page, taskTitle);
    await expectTaskVisible(page, taskTitle);
    await expectTaskSavedToIndexedDB(page, taskTitle);

    await reloadTaskPage(page);
    await expectTaskVisible(page, taskTitle);

    await deleteTaskWithKeyboard(page, taskTitle);
    await expectTaskMissing(page, taskTitle);
    await expectDeleteToastVisible(page);

    await reloadTaskPage(page);
    await expectTaskMissing(page, taskTitle);
  });
});
