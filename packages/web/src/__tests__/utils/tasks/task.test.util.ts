import { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type User = ReturnType<typeof userEvent.setup>;

export function setup(jsx: React.ReactElement) {
  return {
    user: userEvent.setup(),
    ...render(jsx),
  };
}

export class TaskDriver {
  async addTasks(user: User, tasks: string[]) {
    for (const title of tasks) {
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
          // supports multiple tasks with the same title
          const elements = screen.getAllByDisplayValue(title);
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );
    }
  }

  deleteTask(user: User, title: string) {
    const task = screen.getByText(title);
    user.click(task);
  }
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
