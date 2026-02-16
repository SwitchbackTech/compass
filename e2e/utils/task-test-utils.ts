import { type Page, expect } from "@playwright/test";
import { prepareCalendarPage, resetLocalEventDb } from "./event-test-utils";

export const prepareTaskPage = async (page: Page) => {
  await prepareCalendarPage(page);
  // Tasks are visible in Day view, which is the default or can be navigated to.
  // prepareCalendarPage goes to /week.
  // Let's go to /day if needed, or just stay on /week if tasks are visible there?
  // Tasks are only in Day view (usually).

  // Navigate to Day view
  await page.goto("/day");
  await page.waitForURL("/day");

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

export const expectTaskVisible = async (page: Page, title: string) => {
  // Tasks are rendered as inputs
  await expect(page.locator(`input[value="${title}"]`)).toBeVisible();
};

export const clearTasks = async (page: Page) => {
  await resetLocalEventDb(page);
  await page.reload();
  await expect(page.locator('[aria-label="daily-tasks"]')).toBeVisible();
};
