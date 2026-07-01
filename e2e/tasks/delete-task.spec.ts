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

test.describe("Task Delete", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Tasks are not available in the current mobile experience.",
  );

  test("should delete a task and keep it deleted after reload", async ({
    page,
  }) => {
    await prepareTaskPage(page);

    const taskTitle = `Delete Task ${Date.now()}`;
    await createTask(page, taskTitle);

    await expectTaskVisible(page, taskTitle);
    await expectTaskSavedToIndexedDB(page, taskTitle);

    await deleteTaskWithKeyboard(page, taskTitle);
    await expectTaskMissing(page, taskTitle);
    await expectDeleteToastVisible(page);

    await reloadTaskPage(page);
    await expectTaskMissing(page, taskTitle);
  });
});
