import { test } from "@playwright/test";
import {
  createTask,
  expectTaskSavedToIndexedDB,
  expectTaskVisible,
  prepareTaskPage,
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
    await page.reload();
    await expectTaskSavedToIndexedDB(page, taskTitle);
    await expectTaskVisible(page, taskTitle, 10000);
  });
});
