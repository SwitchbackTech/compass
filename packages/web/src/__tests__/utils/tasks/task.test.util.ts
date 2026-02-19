import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

type User = ReturnType<typeof userEvent.setup>;

export const waitForTaskListReady = async () => {
  await waitFor(() => {
    expect(
      screen.getByRole("region", { name: "daily-tasks" }),
    ).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.queryByText("Loading tasks...")).not.toBeInTheDocument();
  });
};

export const addTasks = async (user: User, taskTitles: string[]) => {
  for (const title of taskTitles) {
    const initialTitleCount = screen.queryAllByRole("checkbox", {
      name: `Toggle ${title}`,
    }).length;
    const expectedTitleCount = initialTitleCount + 1;

    // Wait for the add button to be available
    await clickCreateTaskButton(user);

    // Wait for the input to appear
    const input = (await waitFor(() =>
      screen.getByPlaceholderText("Enter task title..."),
    )) as HTMLInputElement;

    await user.clear(input);
    await user.type(input, title);
    await user.keyboard("{Enter}");

    // Wait for the task to be created and appear in the DOM
    await waitFor(
      () => {
        const elements = screen.getAllByRole("checkbox", {
          name: `Toggle ${title}`,
        });
        expect(elements.length).toBeGreaterThanOrEqual(expectedTitleCount);
      },
      { timeout: 5000 },
    );
  }
};

export const clickCreateTaskButton = async (user: User) => {
  await waitForTaskListReady();

  const existingInput = screen.queryByRole("textbox", { name: /task title/i });
  if (existingInput) return existingInput;

  const addButton = await waitFor(
    () => screen.getByRole("button", { name: "Create new task" }),
    { timeout: 5000 },
  );

  await user.click(addButton);

  return waitFor(() => screen.getByRole("textbox", { name: /task title/i }), {
    timeout: 5000,
  });
};

export const focusOnTaskCheckbox = async (user: User, title: string) => {
  const checkbox = await waitFor(() =>
    screen.getByRole("checkbox", { name: `Toggle ${title}` }),
  );
  checkbox.focus();
};
