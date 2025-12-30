import { act } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Task } from "@web/common/types/task.types";

type User = ReturnType<typeof userEvent.setup>;

/**
 * Creates a mock task with optional overrides
 * @param overrides - Partial task properties to override defaults
 * @returns A complete Task object
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    order: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export const addTasks = async (user: User, taskTitles: string[]) => {
  for (const title of taskTitles) {
    // Wait for the add button to be available
    await clickCreateTaskButton(user);

    // Wait for the input to appear
    const input = await waitFor(() =>
      screen.getByPlaceholderText("Enter task title..."),
    );

    await act(async () => {
      await user.type(input, `${title}{Enter}`);
    });

    // Wait for the task to be created and appear in the DOM
    await waitFor(
      () => {
        const elements = screen.getAllByDisplayValue(title);
        expect(elements.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  }
};

export const clickCreateTaskButton = async (user: User) => {
  const addButton = await waitFor(() =>
    screen.getByRole("button", { name: "Create new task" }),
  );
  await act(async () => {
    await user.click(addButton);
  });
};

export const focusOnTaskCheckbox = async (user: User, title: string) => {
  const checkbox = await waitFor(() =>
    screen.getByRole("checkbox", { name: `Toggle ${title}` }),
  );
  await act(async () => {
    checkbox.focus();
  });
};
