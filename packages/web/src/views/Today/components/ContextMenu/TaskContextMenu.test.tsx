import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskProvider } from "../../context/TaskProvider";
import { TaskList } from "../Tasks/TaskList";

// Mock console.log to test the delete action
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

const renderTaskList = (props = {}) => {
  return render(
    <TaskProvider>
      <TaskList {...props} />
    </TaskProvider>,
  );
};

describe("TaskContextMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  it("should open context menu on right-click on a task", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task first
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Test task{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    expect(taskElement).toBeInTheDocument();

    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Check that context menu appears
    await waitFor(() => {
      expect(screen.getByText("Delete Task")).toBeInTheDocument();
    });
  });

  it("should show Delete Task menu item when menu is open", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Test task{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Check that Delete Task menu item is visible
    await waitFor(() => {
      const deleteMenuItem = screen.getByText("Delete Task");
      expect(deleteMenuItem).toBeInTheDocument();
      expect(deleteMenuItem.closest("li")).toHaveClass("cursor-pointer");
    });
  });

  it("should remove task from list when Delete Task is clicked", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Task to delete{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Task to delete")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen
      .getByDisplayValue("Task to delete")
      .closest(".group");
    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Click Delete Task
    await waitFor(() => {
      expect(screen.getByText("Delete Task")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("Delete Task");
    await user.click(deleteButton);

    // Check that task is removed from the list
    await waitFor(() => {
      expect(screen.queryByText("Task to delete")).not.toBeInTheDocument();
    });
  });

  it("should close menu when clicking outside", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Test task{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Check that menu is open
    await waitFor(() => {
      expect(screen.getByText("Delete Task")).toBeInTheDocument();
    });

    // Click outside the menu (on the heading)
    const heading = screen.getByRole("heading", { level: 2 });
    await user.click(heading);

    // Check that menu is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
    });
  });

  it("should close menu when pressing Escape key", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add a task
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Test task{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await user.pointer({ target: taskElement!, keys: "[MouseRight]" });

    // Check that menu is open
    await waitFor(() => {
      expect(screen.getByText("Delete Task")).toBeInTheDocument();
    });

    // Press Escape key
    await user.keyboard("{Escape}");

    // Check that menu is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
    });
  });

  it("should not open context menu when right-clicking on add task button", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Right-click on the add task button
    const addButton = screen.getByText("Add task");
    await user.pointer({ target: addButton, keys: "[MouseRight]" });

    // Check that no context menu appears
    expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
  });

  it("should work with multiple tasks", async () => {
    const user = userEvent.setup();
    renderTaskList();

    // Add two tasks
    const addButton = screen.getByText("Add task");
    await user.click(addButton);
    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "First task{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("First task")).toBeInTheDocument();
    });

    const addButton2 = screen.getByText("Add task");
    await user.click(addButton2);
    const input2 = screen.getByPlaceholderText("Enter task title...");
    await user.type(input2, "Second task{Enter}");

    await waitFor(() => {
      expect(screen.getByDisplayValue("Second task")).toBeInTheDocument();
    });

    // Right-click on the first task
    const firstTaskElement = screen
      .getByDisplayValue("First task")
      .closest(".group");
    await user.pointer({ target: firstTaskElement!, keys: "[MouseRight]" });

    // Check that menu appears and shows correct task
    await waitFor(() => {
      expect(screen.getByText("Delete Task")).toBeInTheDocument();
    });

    // Click Delete Task
    const deleteButton = screen.getByText("Delete Task");
    await user.click(deleteButton);

    // Check that only the first task is deleted
    await waitFor(() => {
      expect(screen.queryByText("First task")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Second task")).toBeInTheDocument();
    });
  });
});
