import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { renderWithDayProviders } from "../../util/day.test-util";
import { TaskList } from "../TaskList/TaskList";

// Mock console.log to test the delete action
const mockConsoleLog = jest.spyOn(console, "log").mockImplementation(() => {});

describe("TaskContextMenu", () => {
  beforeEach(async () => {
    localStorage.clear();
    mockConsoleLog.mockClear();
    await clearCompassLocalDb();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  it("should open context menu on right-click on a task", async () => {
    const user = userEvent.setup();
    renderWithDayProviders(<TaskList />);

    // Add a task first
    const addButton = await screen.findByText("Create task");
    await act(async () => {
      await user.click(addButton);
    });
    const input = screen.getByPlaceholderText("Enter task title...");
    await act(async () => {
      await user.type(input, "Test task{Enter}");
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    expect(taskElement).toBeInTheDocument();

    await act(async () => {
      await user.pointer({ target: taskElement!, keys: "[MouseRight]" });
    });

    // Check that context menu appears
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });
  });

  it("should show Delete Task menu item when menu is open", async () => {
    const user = userEvent.setup();
    renderWithDayProviders(<TaskList />);

    // Add a task
    const addButton = await screen.findByText("Create task");
    await act(async () => {
      await user.click(addButton);
    });
    const input = screen.getByPlaceholderText("Enter task title...");
    await act(async () => {
      await user.type(input, "Test task{Enter}");
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await act(async () => {
      await user.pointer({ target: taskElement!, keys: "[MouseRight]" });
    });

    // Check that Delete Task menu item is visible
    await waitFor(async () => {
      const deleteMenuItem = await screen.findByText("Delete Task");
      expect(deleteMenuItem).toBeInTheDocument();
      expect(deleteMenuItem.closest("button")).toHaveClass("cursor-pointer");
    });
  });

  it("should remove task from list when Delete Task is clicked", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add a task
    const addButton = await screen.findByText("Create task");
    await act(async () => {
      await user.click(addButton);
    });
    const input = screen.getByPlaceholderText("Enter task title...");
    await act(async () => {
      await user.type(input, "Task to delete{Enter}");
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Task to delete")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen
      .getByDisplayValue("Task to delete")
      .closest(".group");
    await act(async () => {
      await user.pointer({ target: taskElement!, keys: "[MouseRight]" });
    });

    // Click Delete Task
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });

    const deleteButton = await screen.findByText("Delete Task");
    await act(async () => {
      await user.click(deleteButton);
    });

    // Check that task is removed from the list
    await waitFor(() => {
      expect(screen.queryByText("Task to delete")).not.toBeInTheDocument();
    });
  });

  it("should close menu when clicking outside", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add a task
    const addButton = await screen.findByText("Create task");
    await act(async () => {
      await user.click(addButton);
    });
    const input = screen.getByPlaceholderText("Enter task title...");
    await act(async () => {
      await user.type(input, "Test task{Enter}");
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await act(async () => {
      await user.pointer({ target: taskElement!, keys: "[MouseRight]" });
    });

    // Check that menu is open
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });

    // Click outside the menu (on the heading button)
    const headingButton = screen.getByRole("button", { name: /select view/i });
    await act(async () => {
      await user.click(headingButton);
    });

    // Check that menu is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
    });
  });

  it("should close menu when pressing Escape key", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add a task
    const addButton = await screen.findByText("Create task");
    await act(async () => {
      await user.click(addButton);
    });
    const input = screen.getByPlaceholderText("Enter task title...");
    await act(async () => {
      await user.type(input, "Test task{Enter}");
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test task")).toBeInTheDocument();
    });

    // Right-click on the task
    const taskElement = screen.getByDisplayValue("Test task").closest(".group");
    await act(async () => {
      await user.pointer({ target: taskElement!, keys: "[MouseRight]" });
    });

    // Check that menu is open
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });

    // Press Escape key
    await act(async () => {
      await user.keyboard("{Escape}");
    });

    // Check that menu is closed
    await waitFor(() => {
      expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
    });
  });

  it("should not open context menu when right-clicking on add task button", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Right-click on the add task button
    const addButton = await screen.findByText("Create task");
    await act(async () => {
      await user.pointer({ target: addButton, keys: "[MouseRight]" });
    });

    // Check that no context menu appears
    expect(screen.queryByText("Delete Task")).not.toBeInTheDocument();
  });

  it("should work with multiple tasks", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add two tasks
    const addButton = await screen.findByText("Create task");
    await act(async () => {
      await user.click(addButton);
    });
    const input = screen.getByPlaceholderText("Enter task title...");
    await act(async () => {
      await user.type(input, "First task{Enter}");
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("First task")).toBeInTheDocument();
    });

    const addButton2 = await screen.findByText("Create task");
    await act(async () => {
      await user.click(addButton2);
    });
    const input2 = screen.getByPlaceholderText("Enter task title...");
    await act(async () => {
      await user.type(input2, "Second task{Enter}");
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Second task")).toBeInTheDocument();
    });

    // Right-click on the first task
    const firstTaskElement = screen
      .getByDisplayValue("First task")
      .closest(".group");
    await act(async () => {
      await user.pointer({ target: firstTaskElement!, keys: "[MouseRight]" });
    });

    // Check that menu appears and shows correct task
    await waitFor(async () => {
      expect(await screen.findByText("Delete Task")).toBeInTheDocument();
    });

    // Click Delete Task
    const deleteButton = await screen.findByText("Delete Task");
    await act(async () => {
      await user.click(deleteButton);
    });

    // Check that only the first task is deleted
    await waitFor(() => {
      expect(screen.queryByText("First task")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Second task")).toBeInTheDocument();
    });
  });
});
