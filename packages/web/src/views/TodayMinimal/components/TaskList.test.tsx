import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TodayMinimalProvider } from "../context/TodayMinimalProvider";
import { TaskList } from "./TaskList";

const renderWithProvider = (props = {}) => {
  return render(
    <TodayMinimalProvider>
      <TaskList {...props} />
    </TodayMinimalProvider>,
  );
};

describe("TaskList", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render without crashing", () => {
    renderWithProvider();

    expect(screen.getByText("Add task")).toBeInTheDocument();
    expect(screen.getByTestId("tasks-scroll")).toBeInTheDocument();
  });

  it("should display today's heading", () => {
    renderWithProvider();

    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    expect(screen.getByText(today)).toBeInTheDocument();
  });

  it("should display priority filter buttons", () => {
    renderWithProvider();

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getAllByText("Work")).toHaveLength(4); // 1 filter button + 3 in task details
    expect(screen.getAllByText("Self")).toHaveLength(2); // 1 filter button + 1 in task details
    expect(screen.getAllByText("Relationships")).toHaveLength(2); // 1 filter button + 1 in task details
  });

  it("should filter tasks by priority", () => {
    renderWithProvider();

    // Initially shows all tasks (5 from mock data)
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);

    // Click Work filter (get all Work buttons and click the first one)
    const workButtons = screen.getAllByText("Work");
    fireEvent.click(workButtons[0]);

    // Should show only Work tasks (3 from mock data)
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);

    // Click Self filter (get all Self buttons and click the first one)
    const selfButtons = screen.getAllByText("Self");
    fireEvent.click(selfButtons[0]);

    // Should show only Self tasks (1 from mock data)
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("should add a new task", async () => {
    renderWithProvider();

    // Click add task
    fireEvent.click(screen.getByText("Add task"));

    // Should show input field
    const input = screen.getByPlaceholderText("Enter task title...");
    expect(input).toBeInTheDocument();

    // Type task title
    fireEvent.change(input, { target: { value: "New task" } });

    // Press Enter to add
    fireEvent.keyDown(input, { key: "Enter" });

    // Should add the task
    await waitFor(() => {
      expect(screen.getByText("New task")).toBeInTheDocument();
    });
  });

  it("should cancel adding task with Escape", () => {
    renderWithProvider();

    // Click add task
    fireEvent.click(screen.getByText("Add task"));

    // Should show input field
    const input = screen.getByPlaceholderText("Enter task title...");
    expect(input).toBeInTheDocument();

    // Press Escape to cancel
    fireEvent.keyDown(input, { key: "Escape" });

    // Should hide input field
    expect(
      screen.queryByPlaceholderText("Enter task title..."),
    ).not.toBeInTheDocument();
  });

  it("should edit task title", async () => {
    renderWithProvider();

    // Click on first task to edit
    const firstTask = screen
      .getAllByRole("checkbox")[0]
      .closest("div")
      ?.querySelector("p");
    fireEvent.click(firstTask!);

    // Should show input field
    const input = screen.getByDisplayValue(/Add timeout to initial sync/);
    expect(input).toBeInTheDocument();

    // Change the title
    fireEvent.change(input, { target: { value: "Updated task title" } });

    // Press Enter to save
    fireEvent.keyDown(input, { key: "Enter" });

    // Should update the task
    await waitFor(() => {
      expect(screen.getByText("Updated task title")).toBeInTheDocument();
    });
  });

  it("should cancel editing task with Escape", () => {
    renderWithProvider();

    // Click on first task to edit
    const firstTask = screen
      .getAllByRole("checkbox")[0]
      .closest("div")
      ?.querySelector("p");
    fireEvent.click(firstTask!);

    // Should show input field
    const input = screen.getByDisplayValue(/Add timeout to initial sync/);
    expect(input).toBeInTheDocument();

    // Press Escape to cancel
    fireEvent.keyDown(input, { key: "Escape" });

    // Should hide input field and show original title
    expect(
      screen.queryByDisplayValue(/Updated task title/),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Add timeout to initial sync/)).toBeInTheDocument();
  });

  it("should toggle task status", () => {
    renderWithProvider();

    // Get first task checkbox
    const firstCheckbox = screen.getAllByRole("checkbox")[0];

    // Initially not completed
    expect(firstCheckbox).toHaveAttribute("aria-checked", "false");

    // Click to toggle
    fireEvent.click(firstCheckbox);

    // Should be completed
    expect(firstCheckbox).toHaveAttribute("aria-checked", "true");

    // Click again to toggle back
    fireEvent.click(firstCheckbox);

    // Should be not completed again
    expect(firstCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("should toggle task status with keyboard", () => {
    renderWithProvider();

    // Get first task checkbox
    const firstCheckbox = screen.getAllByRole("checkbox")[0];

    // Focus the checkbox
    firstCheckbox.focus();

    // Press Space to toggle
    fireEvent.keyDown(firstCheckbox, { key: " " });

    // Should be completed
    expect(firstCheckbox).toHaveAttribute("aria-checked", "true");

    // Press Enter to toggle back
    fireEvent.keyDown(firstCheckbox, { key: "Enter" });

    // Should be not completed again
    expect(firstCheckbox).toHaveAttribute("aria-checked", "false");
  });

  it("should show task details", () => {
    renderWithProvider();

    // Check that task details are displayed (use getAllByText since there are multiple)
    expect(screen.getAllByText("Development")).toHaveLength(2);
    expect(screen.getAllByText("Work")).toHaveLength(4); // 3 in task details + 1 in filter
    expect(screen.getAllByText("25m")).toHaveLength(3);
  });

  it("should call onTaskFocus when task is focused", () => {
    const onTaskFocus = jest.fn();
    renderWithProvider({ onTaskFocus });

    // Focus first task
    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstCheckbox);

    expect(onTaskFocus).toHaveBeenCalledWith(expect.any(String));
  });

  it("should call onSelectTask when task is focused", () => {
    const onSelectTask = jest.fn();
    renderWithProvider({ onSelectTask });

    // Focus first task
    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstCheckbox);

    expect(onSelectTask).toHaveBeenCalledWith(0);
  });

  it("should show hover state for add task button", () => {
    renderWithProvider();

    const addTaskButton = screen.getByText("Add task").closest("div");

    // Hover over add task button
    fireEvent.mouseEnter(addTaskButton!);

    // Should show keyboard shortcut hint
    expect(screen.getByText("T")).toBeInTheDocument();

    // Mouse leave
    fireEvent.mouseLeave(addTaskButton!);

    // Should hide keyboard shortcut hint
    expect(screen.queryByText("T")).not.toBeInTheDocument();
  });

  it("should handle blur events correctly", () => {
    const onTaskFocus = jest.fn();
    renderWithProvider({ onTaskFocus });

    // Focus first task
    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.focus(firstCheckbox);

    expect(onTaskFocus).toHaveBeenCalledWith(expect.any(String));

    // Blur to another task
    const secondCheckbox = screen.getAllByRole("checkbox")[1];
    fireEvent.blur(firstCheckbox, { relatedTarget: secondCheckbox });

    // Should not call onTaskFocus with null
    expect(onTaskFocus).not.toHaveBeenCalledWith(null);

    // Blur to non-task element
    fireEvent.blur(secondCheckbox, { relatedTarget: document.body });

    // Should call onTaskFocus with null
    expect(onTaskFocus).toHaveBeenCalledWith(null);
  });

  it("should show completed tasks with reduced opacity", () => {
    renderWithProvider();

    // Toggle first task to completed
    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(firstCheckbox);

    // Get the task container
    const taskContainer = firstCheckbox.closest("div");

    // Should have opacity-50 class
    expect(taskContainer).toHaveClass("opacity-50");
  });

  it("should display priority colors correctly", () => {
    renderWithProvider();

    // Work tasks should have blue border (check the task containers, not the text spans)
    const workCheckboxes = screen.getAllByRole("checkbox");
    workCheckboxes.forEach((checkbox) => {
      const taskContainer = checkbox.closest("div");
      if (taskContainer?.textContent?.includes("Work")) {
        expect(taskContainer).toHaveClass(
          "border-blue-300/30",
          "bg-blue-300/5",
        );
      }
    });
  });
});
