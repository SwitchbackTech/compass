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

const prepareFourTasks = async (page: Page) => {
  await prepareTaskPage(page);

  for (const title of ["task 1", "task 2", "task 3", "task4"]) {
    await createTask(page, title);
    await expectTaskVisible(page, title);
  }

  await expectTaskOrder(page, "task 1", "task 2");
  await expectTaskOrder(page, "task 2", "task 3");
  await expectTaskOrder(page, "task 3", "task4");
};

const hoverTaskReorderHandle = async (page: Page, title: string) => {
  const handle = page.getByRole("button", { name: `Reorder ${title}` });
  const handleBox = await handle.boundingBox();

  if (!handleBox) {
    throw new Error(`Expected the ${title} drag handle to be in the layout.`);
  }

  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );

  return handle;
};

const liftTaskWithKeyboard = async (page: Page, title: string) => {
  const handle = page.getByRole("button", { name: `Reorder ${title}` });

  await handle.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#task-list-drop-zone")).toHaveClass(
    /border-border-primary/,
  );
  // dnd-kit's KeyboardSensor attaches its move/end keydown listener in a
  // setTimeout (so the activating keydown can't immediately end the drag);
  // give it a beat before sending further keys.
  await page.waitForTimeout(250);
};

// dnd-kit applies arrow-key moves through a React render, so dropping
// immediately after ArrowDown can end the drag with a stale target. Wait for
// the screen-reader move announcement — what a real keyboard user hears
// before releasing — to know the move landed.
const expectDragAnnouncement = (page: Page, pattern: RegExp) =>
  expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll("[aria-live]"))
          .map((node) => node.textContent)
          .join(" "),
      ),
    )
    .toMatch(pattern);

test.describe("Task Reordering", () => {
  test.skip(
    ({ isMobile }) => isMobile,
    "Tasks are not available in the current mobile experience.",
  );

  test("reorders tasks with the keyboard and persists the order", async ({
    page,
  }) => {
    await prepareTwoTasks(page);

    await liftTaskWithKeyboard(page, "Task A");
    await page.keyboard.press("ArrowDown");
    await expectDragAnnouncement(page, /at new position below Task B/);
    await page.keyboard.press("Space");

    await expect(page.locator("#task-list-drop-zone")).not.toHaveClass(
      /border-border-primary/,
    );
    await expectTaskOrder(page, "Task B", "Task A");

    await reloadTaskPage(page);

    await expectTaskOrder(page, "Task B", "Task A");
  });

  test("scrolls to reveal tasks beyond the visible area", async ({ page }) => {
    await prepareTaskPage(page);

    const titles = Array.from({ length: 14 }, (_, i) => `Scroll Task ${i + 1}`);

    for (const title of titles) {
      await createTask(page, title);
    }

    await expectTaskVisible(page, "Scroll Task 14");

    const dropZone = page.locator("#task-list-drop-zone");

    await expect
      .poll(() =>
        dropZone.evaluate(
          (element) => element.scrollHeight - element.clientHeight,
        ),
      )
      .toBeGreaterThan(0);

    // Wheel-scroll the list and confirm the last task comes into view.
    await dropZone.hover();
    await page.mouse.wheel(0, 1000);

    await expect
      .poll(async () => {
        const dropZoneBox = await dropZone.boundingBox();
        const lastTaskBox = await page
          .getByRole("textbox", { name: "Edit Scroll Task 14" })
          .boundingBox();

        if (!dropZoneBox || !lastTaskBox) return false;

        return (
          lastTaskBox.y + lastTaskBox.height <=
          dropZoneBox.y + dropZoneBox.height + 1
        );
      })
      .toBe(true);
  });

  test("cancels a keyboard reorder with escape", async ({ page }) => {
    await prepareTwoTasks(page);

    await liftTaskWithKeyboard(page, "Task A");
    await page.keyboard.press("ArrowDown");
    await expectDragAnnouncement(page, /at new position below Task B/);
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

    const dropZone = page.locator("#task-list-drop-zone");
    await expect(dropZone).toHaveCSS("scrollbar-gutter", "auto");

    // The drag handle floats left of the row and fades in on direct hover.
    const handle = await hoverTaskReorderHandle(page, "Task A");
    await expect(handle).toHaveCSS("opacity", "1");

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

    await page.mouse.move(10, 10);
    await expect(handle).toHaveCSS("opacity", "0");

    await expect(await hoverTaskReorderHandle(page, "Task A")).toHaveCSS(
      "opacity",
      "1",
    );

    await expect(await hoverTaskReorderHandle(page, "Task B")).toHaveCSS(
      "opacity",
      "1",
    );

    await reloadTaskPage(page);

    await expectTaskOrder(page, "Task B", "Task A");
  });

  test("keeps every task handle hoverable after mouse reordering", async ({
    page,
  }) => {
    await prepareFourTasks(page);

    const task3Handle = await hoverTaskReorderHandle(page, "task 3");
    await expect(task3Handle).toHaveCSS("opacity", "1");

    const task3HandleBox = await task3Handle.boundingBox();
    const task1RowBox = await page
      .getByRole("textbox", { name: "Edit task 1" })
      .boundingBox();

    if (!task3HandleBox || !task1RowBox) {
      throw new Error("Expected the drag handle and target row to be visible.");
    }

    await page.mouse.move(
      task3HandleBox.x + task3HandleBox.width / 2,
      task3HandleBox.y + task3HandleBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      task3HandleBox.x + task3HandleBox.width / 2,
      task1RowBox.y,
      { steps: 8 },
    );
    await page.mouse.up();

    await expectTaskOrder(page, "task 3", "task 1");
    await expectTaskOrder(page, "task 1", "task 2");
    await expectTaskOrder(page, "task 2", "task4");

    await page.mouse.move(10, 10);

    for (const title of ["task 3", "task4", "task 2", "task 1"]) {
      await expect(await hoverTaskReorderHandle(page, title)).toHaveCSS(
        "opacity",
        "1",
      );
    }
  });
});
