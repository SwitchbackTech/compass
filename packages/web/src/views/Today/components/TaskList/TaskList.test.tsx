import React, { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import {
  addTasks,
  clickCreateTaskButton,
  setup,
} from "../../../../__tests__/utils/tasks/task.test.util";
import { TaskProvider } from "../../context/TaskProvider";
import { TaskList } from "./TaskList";

export const renderTaskList = (props = {}) => {
  return setup(
    <TaskProvider>
      <TaskList {...props} />
    </TaskProvider>,
  );
};

describe("TaskList", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render create task button", () => {
    renderTaskList();

    const addButton = screen.getByText("Create task");
    expect(addButton).toBeInTheDocument();
  });

  it("should show create task input when clicking create button", async () => {
    const { user } = renderTaskList();

    await clickCreateTaskButton(user);

    const input = screen.getByPlaceholderText("Enter task title...");
    expect(input).toBeInTheDocument();
  });

  it("should focus add task input on first click and allow typing", async () => {
    const { user } = renderTaskList();

    await clickCreateTaskButton(user);

    const input = screen.getByRole("textbox", { name: /task title/i });
    expect(input).toHaveFocus();

    await act(async () => {
      await user.type(input, "My new task");
    });
    expect(input).toHaveValue("My new task");
  });

  it("should add a task when entering text and pressing Enter", async () => {
    const { user } = renderTaskList();

    await addTasks(user, ["New task"]);
    // TODO finish
  });

  it("should not add empty task", async () => {
    const { user } = renderTaskList();

    const addButton = screen.getByText("Create task");
    await act(async () => {
      await user.click(addButton);
    });

    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // Input should remain open but no task should be added
    expect(
      screen.getByPlaceholderText("Enter task title..."),
    ).toBeInTheDocument();

    // No tasks should be visible (no checkboxes)
    const taskCheckboxes = screen.queryAllByRole("checkbox");
    expect(taskCheckboxes).toHaveLength(0);
  });

  it("should cancel adding task on Escape", async () => {
    const { user } = renderTaskList();

    const addButton = screen.getByText("Create task");
    await act(async () => {
      await user.click(addButton);
    });

    const input = screen.getByPlaceholderText("Enter task title...");
    await act(async () => {
      await user.type(input, "Some text");
    });
    await act(async () => {
      await user.keyboard("{Escape}");
    });

    // Add button should be visible again
    await waitFor(() => {
      expect(screen.getByText("Create task")).toBeInTheDocument();
    });
  });

  it("should toggle task completion when clicking checkbox", async () => {
    const { user } = renderTaskList();

    // Add a task first
    await addTasks(user, ["Task to complete"]);

    // Click the checkbox
    const checkbox = screen.getByRole("checkbox", {
      name: "Toggle Task to complete",
    });
    await act(async () => {
      await user.click(checkbox);
    });

    // Check that checkbox is now checked
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("should enter edit mode when clicking task text", async () => {
    const { user } = renderTaskList();

    // Add a task
    await addTasks(user, ["Edit me"]);

    // Click on the task input
    const taskInput = screen.getByDisplayValue("Edit me");
    await act(async () => {
      await user.click(taskInput);
    });

    // Should show input with current value
    const editInput = screen.getByDisplayValue("Edit me");
    expect(editInput).toBeInTheDocument();
  });

  it("should update task title when editing", async () => {
    const { user } = renderTaskList();

    // Add a task
    await addTasks(user, ["Original title"]);

    // Edit the task
    const taskInput = screen.getByDisplayValue("Original title");
    await act(async () => {
      await user.click(taskInput);
    });

    const editInput = screen.getByDisplayValue("Original title");
    await act(async () => {
      await user.clear(editInput);
      await user.type(editInput, "Updated title{Enter}");
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Updated title")).toBeInTheDocument();
    });
  });

  it("should cancel edit on Escape", async () => {
    const { user } = renderTaskList();

    // Add a task
    await addTasks(user, ["Original"]);

    // Start editing
    const taskInput = screen.getByDisplayValue("Original");
    await act(async () => {
      await user.click(taskInput);
    });

    const editInput = screen.getByDisplayValue("Original");
    await act(async () => {
      await user.type(editInput, " changed");
    });
    await act(async () => {
      await user.keyboard("{Escape}");
    });

    // Should show original text
    await waitFor(() => {
      expect(screen.getByDisplayValue("Original")).toBeInTheDocument();
    });
  });

  it("should show keyboard shortcut hint on hover over add button", async () => {
    const { user } = renderTaskList();

    const addTaskArea = screen.getByText("Create task").parentElement!;
    await act(async () => {
      await user.hover(addTaskArea);
    });

    await waitFor(() => {
      expect(screen.getByText("C")).toBeInTheDocument();
    });
  });

  it("should display completed tasks with reduced opacity", async () => {
    const { user } = renderTaskList();

    // Add a task
    await addTasks(user, ["Complete me"]);

    // Complete the task
    const checkbox = screen.getByRole("checkbox");
    await act(async () => {
      await user.click(checkbox);
    });

    // Check for opacity class - need to go up to the task container div
    const taskInput = screen.getByDisplayValue("Complete me");
    const taskElement = taskInput.parentElement?.parentElement;
    expect(taskElement).toHaveClass("opacity-50");
  });

  it("should add new tasks above completed tasks", async () => {
    const { user } = renderTaskList();

    // Add first task
    await addTasks(user, ["First task"]);

    // Complete the first task
    const checkbox = screen.getByRole("checkbox", {
      name: "Toggle First task",
    });
    await act(async () => {
      await user.click(checkbox);
    });

    // Add a second task
    await addTasks(user, ["Second task"]);

    // Get all checkboxes and verify order
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);

    // The second task (incomplete) should appear first
    expect(checkboxes[0]).toHaveAttribute("aria-label", "Toggle Second task");
    expect(checkboxes[0]).toHaveAttribute("aria-checked", "false");

    // The first task (completed) should appear second
    expect(checkboxes[1]).toHaveAttribute("aria-label", "Toggle First task");
    expect(checkboxes[1]).toHaveAttribute("aria-checked", "true");
  });

  it("should maintain focus after pressing ESC in edit mode, allowing re-edit with 'e'", async () => {
    const { user } = renderTaskList();

    // Add a task
    await addTasks(user, ["Test task"]);

    // Focus the task checkbox
    const checkbox = screen.getByRole("checkbox", {
      name: /Toggle Test task/i,
    });
    await act(async () => {
      checkbox.focus();
    });
    expect(checkbox).toHaveFocus();

    // Press 'e' directly on the button
    await act(async () => {
      await user.keyboard("e");
    });

    await waitFor(() => {
      const editInput = screen.getByDisplayValue("Test task");
      expect(editInput).toBeInTheDocument();
      // Input is in edit mode but doesn't automatically get focus without refs
    });

    // Press ESC
    await act(async () => {
      await user.keyboard("{Escape}");
    });

    // Button should have focus again
    await waitFor(() => {
      expect(checkbox).toHaveFocus();
    });

    // Input should still be visible but not focused
    expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();

    // Press 'e' again on the button
    await act(async () => {
      await user.keyboard("e");
    });

    await waitFor(() => {
      const editInput2 = screen.getByDisplayValue("Test task");
      expect(editInput2).toBeInTheDocument();
      expect(editInput2).toHaveValue("Test task");
    });
  });

  it("should activate add task input when pressing Enter on Add task button after tabbing", async () => {
    const { user } = renderTaskList();

    // First add some existing tasks to create a realistic scenario
    await addTasks(user, ["First task", "Second task"]);

    // Now tab to the Add task button
    const addTaskButton = screen.getByRole("button", { name: /add new task/i });
    await act(async () => {
      addTaskButton.focus();
    });
    expect(addTaskButton).toHaveFocus();

    // Press Enter on the Add task button
    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // Verify the input is activated and focused
    await waitFor(() => {
      const newInput = screen.getByPlaceholderText("Enter task title...");
      expect(newInput).toBeInTheDocument();
      expect(newInput).toHaveFocus();
    });

    // Type a new task title
    await act(async () => {
      await user.type(
        screen.getByPlaceholderText("Enter task title..."),
        "New task via Enter",
      );
    });

    // Press Enter to submit the task
    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // Verify the task is created and no longer in edit mode
    await waitFor(() => {
      expect(
        screen.getByDisplayValue("New task via Enter"),
      ).toBeInTheDocument();
      // The add button should be visible again (not in edit mode)
      expect(
        screen.getByRole("button", { name: /add new task/i }),
      ).toBeInTheDocument();
    });

    // Verify we have all three tasks
    const allTasks = screen.getAllByRole("checkbox");
    expect(allTasks).toHaveLength(3);
  });

  it("should delete task when title is cleared and Enter is pressed", async () => {
    const { user } = renderTaskList();

    // Add a task
    await addTasks(user, ["Task to delete"]);

    // Verify task exists
    expect(screen.getByDisplayValue("Task to delete")).toBeInTheDocument();

    // Focus on the task input
    const taskInput = screen.getByDisplayValue("Task to delete");
    await act(async () => {
      await user.click(taskInput);
    });

    // Clear the input (making title "")
    await act(async () => {
      await user.clear(taskInput);
    });

    // Press Enter
    await act(async () => {
      await user.keyboard("{Enter}");
    });

    // Assert that the task is gone (deleted)
    await waitFor(() => {
      expect(
        screen.queryByDisplayValue("Task to delete"),
      ).not.toBeInTheDocument();
    });

    // Verify no tasks remain
    const taskCheckboxes = screen.queryAllByRole("checkbox");
    expect(taskCheckboxes).toHaveLength(0);
  });
});
