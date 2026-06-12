import { expect, type Page, test } from "@playwright/test";
import {
  createTask,
  expectTaskVisible,
  prepareTaskPage,
  reloadTaskPage,
} from "../utils/task-test-utils";

const getTaskTitlesInOrder = (page: Page) =>
  page
    .locator('[aria-label="Task list"] input[aria-label^="Edit "]')
    .evaluateAll((inputs) =>
      inputs.map((input) => (input as HTMLInputElement).value),
    );

const expectTaskOrder = (page: Page, before: string, after: string) =>
  expect
    .poll(async () => {
      const titles = await getTaskTitlesInOrder(page);
      const beforeIndex = titles.indexOf(before);
      const afterIndex = titles.indexOf(after);

      return (
        beforeIndex !== -1 && afterIndex !== -1 && beforeIndex < afterIndex
      );
    })
    .toBe(true);

const prepareTwoTasks = async (page: Page) => {
  await prepareTaskPage(page);
  await createTask(page, "Task A");
  await createTask(page, "Task B");
  await expectTaskVisible(page, "Task A");
  await expectTaskVisible(page, "Task B");
  await expectTaskOrder(page, "Task A", "Task B");
};

const liftTaskWithKeyboard = async (page: Page, title: string) => {
  const handle = page.getByRole("button", { name: `Reorder ${title}` });

  await handle.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#task-list-drop-zone")).toHaveClass(
    /border-border-primary/,
  );
  await page.waitForTimeout(250);
};

test.describe("Task Reordering", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Tasks are not available in the current mobile experience.",
  );

  test("cancels a keyboard reorder with escape", async ({ page }) => {
    await prepareTwoTasks(page);

    await liftTaskWithKeyboard(page, "Task A");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");

    await expect(page.locator("#task-list-drop-zone")).not.toHaveClass(
      /border-border-primary/,
    );
    await expectTaskOrder(page, "Task A", "Task B");
  });

  test("reorders tasks with the mouse and persists the order", async ({
    page,
  }) => {
    await prepareTwoTasks(page);

    // The drag handle floats left of the row and fades in on hover.
    await page.getByRole("textbox", { name: "Edit Task A" }).hover();

    const handle = page.getByRole("button", { name: "Reorder Task A" });
    const handleBox = await handle.boundingBox();
    const targetRowBox = await page
      .getByRole("textbox", { name: "Edit Task B" })
      .boundingBox();

    if (!handleBox || !targetRowBox) {
      throw new Error("Expected the drag handle and task rows to be visible.");
    }

    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      handleBox.y + handleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      handleBox.x + handleBox.width / 2,
      targetRowBox.y + targetRowBox.height,
      { steps: 8 },
    );
    await page.mouse.up();

    await expectTaskOrder(page, "Task B", "Task A");

    await reloadTaskPage(page);

    await expectTaskOrder(page, "Task B", "Task A");
  });
});
