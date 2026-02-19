import { test } from "@playwright/test";
import {
  createTask,
  deleteTaskWithKeyboard,
  expectTaskMissing,
  expectTaskSavedToIndexedDB,
  expectTaskVisible,
  prepareTaskPage,
  restoreDeletedTaskFromUndoToast,
} from "../utils/task-test-utils";

test.describe("Task Delete + Restore", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Tasks are not available in the current mobile experience.",
  );

  test("should restore a deleted task from the undo toast", async ({
    page,
  }) => {
    await prepareTaskPage(page);

    const taskTitle = `Delete Restore Task ${Date.now()}`;
    await createTask(page, taskTitle);

    await expectTaskVisible(page, taskTitle);
    await expectTaskSavedToIndexedDB(page, taskTitle);

    await deleteTaskWithKeyboard(page, taskTitle);
    await expectTaskMissing(page, taskTitle);

    await restoreDeletedTaskFromUndoToast(page);
    await expectTaskVisible(page, taskTitle);
    await expectTaskSavedToIndexedDB(page, taskTitle);

    await page.reload();
    await expectTaskVisible(page, taskTitle, 10000);
    await expectTaskSavedToIndexedDB(page, taskTitle);
  });
});
