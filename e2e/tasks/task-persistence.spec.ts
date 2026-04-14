import { test } from "@playwright/test";
import {
  createTask,
  expectTaskSavedToIndexedDB,
  expectTaskVisible,
  prepareTaskPage,
  reloadTaskPage,
} from "../utils/task-test-utils";

test.describe("Task Persistence", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Tasks are not available in the current mobile experience.",
  );

  test("should persist tasks after reload (IndexedDB)", async ({ page }) => {
    await prepareTaskPage(page);

    const taskTitle = `Persistent Task ${Date.now()}`;
    await createTask(page, taskTitle);

    // Verify it's visible
    await expectTaskVisible(page, taskTitle);
    await expectTaskSavedToIndexedDB(page, taskTitle);

    // Reload and verify persistence.
    await reloadTaskPage(page);
    await expectTaskSavedToIndexedDB(page, taskTitle);
    await expectTaskVisible(page, taskTitle, 10000);
  });
});
