import { test } from "@playwright/test";
import {
  createTask,
  expectTaskVisible,
  prepareTaskPage,
} from "../utils/task-test-utils";

test.describe("Task Persistence", () => {
  test("should persist tasks after reload (IndexedDB)", async ({ page }) => {
    await prepareTaskPage(page);

    const taskTitle = "Persistent Task";
    await createTask(page, taskTitle);

    // Verify it's visible
    await expectTaskVisible(page, taskTitle);

    // Allow time for IndexedDB to save
    await page.waitForTimeout(1000);

    // Reload the page
    await page.reload();

    // Verify it's still visible
    await expectTaskVisible(page, taskTitle);
  });
});
