import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskProvider } from "../context/TaskProvider";
import { TaskList } from "./TaskList";

const renderTaskList = (props = {}) => {
  return render(
    <TaskProvider>
      <TaskList {...props} />
    </TaskProvider>,
  );
};

describe("TaskList", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render the today heading with current date", () => {
    renderTaskList();

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/\w+, \w+ \d+/); // Matches format like "Wednesday, January 15"
  });

  it("should render add task button", () => {
    renderTaskList();

    const addButton = screen.getByText("Add task");
    expect(addButton).toBeInTheDocument();
  });

  it("should show add task input when clicking add button", async () => {
    const user = userEvent.setup();
    renderTaskList();

    const addButton = screen.getByText("Add task");
    await user.click(addButton);

    const input = screen.getByPlaceholderText("Enter task title...");
    expect(input).toBeInTheDocument();
  });

  it("should add a task when entering text and pressing Enter", async () => {
    const user = userEvent.setup();
    renderTaskList();

    const addButton = screen.getByText("Add task");
    await user.click(addButton);

    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "New task");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText("New task")).toBeInTheDocument();
    });
  });

  it("should not add empty task", async () => {
    const user = userEvent.setup();
    renderTaskList();

    const addButton = screen.getByText("Add task");
    await user.click(addButton);

    const input = screen.getByPlaceholderText("Enter task title...");
    await user.keyboard("{Enter}");

    // Input should remain open but no task should be added
    expect(
      screen.getByPlaceholderText("Enter task title..."),
    ).toBeInTheDocument();

    // No tasks should be visible (no checkboxes)
    const taskCheckboxes = screen.queryAllByRole("checkbox");
    expect(taskCheckboxes).toHaveLength(0);
  });

  it("should cancel adding task on Escape", async () => {
    const user = userEvent.setup();
    renderTaskList();

    const addButton = screen.getByText("Add task");
    await user.click(addButton);

    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Some text");
    await user.keyboard("{Escape}");

    // Add button should be visible again
    await waitFor(() => {
      expect(screen.getByText("Add task")).toBeInTheDocument();
    });
  });

  it("should toggle task completion when clicking checkbox", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task first
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Task to complete{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Task to complete")).toBeInTheDocument();
    });

    // Click the checkbox
    const checkbox = screen.getByRole("checkbox", {
      name: "Toggle Task to complete",
    });
    await user.click(checkbox);

    // Check that checkbox is now checked
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("should enter edit mode when clicking task text", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Edit me{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Edit me")).toBeInTheDocument();
    });

    // Click on the task text
    const taskText = screen.getByText("Edit me");
    await user.click(taskText);

    // Should show input with current value
    const editInput = screen.getByDisplayValue("Edit me");
    expect(editInput).toBeInTheDocument();
  });

  it("should update task title when editing", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Original title{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Original title")).toBeInTheDocument();
    });

    // Edit the task
    const taskText = screen.getByText("Original title");
    await user.click(taskText);

    const editInput = screen.getByDisplayValue("Original title");
    await user.clear(editInput);
    await user.type(editInput, "Updated title{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Updated title")).toBeInTheDocument();
    });
  });

  it("should cancel edit on Escape", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Original{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Original")).toBeInTheDocument();
    });

    // Start editing
    const taskText = screen.getByText("Original");
    await user.click(taskText);

    const editInput = screen.getByDisplayValue("Original");
    await user.type(editInput, " changed");
    await user.keyboard("{Escape}");

    // Should show original text
    await waitFor(() => {
      expect(screen.getByText("Original")).toBeInTheDocument();
    });
  });

  it("should call onTaskFocus when task is focused", async () => {
    const onTaskFocus = jest.fn();
    const user = userEvent.setup();

    renderTaskList({ onTaskFocus });

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Focus task{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Focus task")).toBeInTheDocument();
    });

    // Focus the checkbox
    const checkbox = screen.getByRole("checkbox");
    fireEvent.focus(checkbox);

    expect(onTaskFocus).toHaveBeenCalled();
  });

  it("should show keyboard shortcut hint on hover over add button", async () => {
    const user = userEvent.setup();
    renderTaskList();

    const addTaskArea = screen.getByText("Add task").parentElement!;
    await user.hover(addTaskArea);

    await waitFor(() => {
      expect(screen.getByText("T")).toBeInTheDocument();
    });
  });

  it("should show different priority colors", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task (default priority is Work)
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Work task{Enter}");

    await waitFor(() => {
      const taskText = screen.getByText("Work task");
      const taskElement = taskText.parentElement?.parentElement;
      expect(taskElement).toHaveClass("border-blue-300/30");
    });
  });

  it("should display completed tasks with reduced opacity", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Complete me{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Complete me")).toBeInTheDocument();
    });

    // Complete the task
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // Check for opacity class - need to go up to the task container div
    const taskText = screen.getByText("Complete me");
    const taskElement = taskText.parentElement?.parentElement;
    expect(taskElement).toHaveClass("opacity-50");
  });
});
