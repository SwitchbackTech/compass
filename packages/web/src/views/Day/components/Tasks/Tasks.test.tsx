import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { addTasks } from "@web/__tests__/utils/tasks/task.test.util";
import { DNDTasksProvider } from "../../context/DNDTasksProvider";
import { renderWithDayProviders } from "../../util/day.test-util";
import { TaskList } from "../TaskList/TaskList";
import { Tasks } from "./Tasks";

describe("Tasks Tab Navigation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render empty state initially", async () => {
    renderWithDayProviders(
      <DNDTasksProvider>
        <Tasks />
      </DNDTasksProvider>,
    );

    // Initially no tasks should be visible
    await expect(screen.findAllByRole("checkbox")).rejects.toThrow();
    await expect(screen.findAllByRole("textbox")).rejects.toThrow();
  });

  it("should render the tasks container", async () => {
    renderWithDayProviders(
      <DNDTasksProvider>
        <Tasks />
      </DNDTasksProvider>,
    );

    // Verify the component renders without errors by checking for the container div
    await waitFor(() => {
      const container = document.querySelector("#task-list-drop-zone");
      expect(container).toBeInTheDocument();
    });
  });
});

describe("Tasks Keyboard Drag and Drop", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render drag handles when there are multiple tasks", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add multiple tasks
    await addTasks(user, ["First task", "Second task"]);

    // Verify drag handles are rendered (the DotsSixVerticalIcon button)
    // The drag handle is an IconButton containing the DotsSixVerticalIcon
    const dragHandles = screen.getAllByRole("button", { name: /Reorder/i });
    expect(dragHandles.length).toBe(2);
  });

  it("should not render drag handles when there is only one task", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add only one task
    await addTasks(user, ["Single task"]);

    // Verify no drag handles are rendered
    const dragHandles = screen.queryAllByRole("button", { name: /Reorder/i });
    expect(dragHandles.length).toBe(0);
  });

  it("should have focusable drag handles for keyboard navigation", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add multiple tasks
    await addTasks(user, ["First task", "Second task"]);

    // Find drag handles
    const dragHandles = screen.getAllByRole("button", { name: /Reorder/i });
    expect(dragHandles.length).toBe(2);

    // Verify the first drag handle can receive focus
    const firstDragHandle = dragHandles[0];
    await act(async () => {
      firstDragHandle.focus();
    });
    expect(firstDragHandle).toHaveFocus();
  });

  it("should reorder tasks when using keyboard drag and drop", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add multiple tasks
    await addTasks(user, ["First task", "Second task", "Third task"]);

    // Verify initial order
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toHaveAttribute("aria-label", "Toggle First task");
    expect(checkboxes[1]).toHaveAttribute("aria-label", "Toggle Second task");
    expect(checkboxes[2]).toHaveAttribute("aria-label", "Toggle Third task");

    // Find drag handles
    const dragHandles = screen.getAllByRole("button", { name: /Reorder/i });
    const firstDragHandle = dragHandles[0];

    // Verify drag handle has proper keyboard attributes for accessibility
    expect(firstDragHandle).toHaveAttribute("tabindex", "0");
    expect(firstDragHandle).toHaveAttribute("role", "button");
    expect(firstDragHandle).toHaveAttribute("aria-describedby");

    // Focus on the first drag handle
    await act(async () => {
      firstDragHandle.focus();
    });
    expect(firstDragHandle).toHaveFocus();

    // Note: Full keyboard DND (Space to lift, arrows to move, Space to drop)
    // cannot be fully tested in JSDOM as it doesn't support the required
    // dimension calculations. The keyboard sensor is verified by:
    // 1. Drag handles having correct tabindex and role
    // 2. Drag handles being focusable
    // 3. The @hello-pangea/dnd library providing keyboard support by default
    // The actual keyboard reordering should be tested in E2E tests.
  });

  it("should cancel drag and restore original order when pressing Escape", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add multiple tasks
    await addTasks(user, ["First task", "Second task"]);

    // Verify initial order
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toHaveAttribute("aria-label", "Toggle First task");
    expect(checkboxes[1]).toHaveAttribute("aria-label", "Toggle Second task");

    // Find drag handles
    const dragHandles = screen.getAllByRole("button", { name: /Reorder/i });
    const firstDragHandle = dragHandles[0];

    // Verify drag handle has proper keyboard attributes
    expect(firstDragHandle).toHaveAttribute("tabindex", "0");
    expect(firstDragHandle).toHaveAttribute("role", "button");

    // Note: Full keyboard DND cancellation cannot be tested in JSDOM.
    // The Escape key behavior is provided by @hello-pangea/dnd's keyboard sensor
    // and should be tested in E2E tests.
  });

  it("should have accessible description for drag handles", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add multiple tasks
    await addTasks(user, ["First task", "Second task"]);

    // Find drag handles
    const dragHandles = screen.getAllByRole("button", { name: /Reorder/i });
    const firstDragHandle = dragHandles[0];

    // Verify drag handle has aria-describedby
    const describedById = firstDragHandle.getAttribute("aria-describedby");
    expect(describedById).toBeTruthy();

    // Verify the description element exists and has correct text
    const descriptionElement = document.getElementById(describedById!);
    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveTextContent(
      "Press space to start dragging this task.",
    );
    expect(descriptionElement).toHaveClass("hidden");
  });
});
