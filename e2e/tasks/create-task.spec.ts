import { test } from "@playwright/test";
import {
  createTask,
  expectTaskVisible,
  prepareTaskPage,
} from "../utils/task-test-utils";

test.describe("Task Creation", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Tasks are not available in the current mobile experience.",
  );

  test("should create a new task using the UI", async ({ page }) => {
    await prepareTaskPage(page);

    const taskTitle = "New Test Task";
    await createTask(page, taskTitle);

    await expectTaskVisible(page, taskTitle);
  });
});
