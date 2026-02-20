import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { prepareEmptyStorageForTests } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { addTasks } from "@web/__tests__/utils/tasks/task.test.util";
import { TaskList } from "@web/views/Day/components/TaskList/TaskList";
import { Tasks } from "@web/views/Day/components/Tasks/Tasks";
import { DNDTasksProvider } from "@web/views/Day/context/DNDTasksContext";
import { renderWithDayProviders } from "@web/views/Day/util/day.test-util";

describe("Tasks Tab Navigation", () => {
  beforeEach(async () => {
    await prepareEmptyStorageForTests();
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
      const container = screen.getByRole("list", { name: "Task list" });
      expect(container).toBeInTheDocument();
    });
  });
});

describe("Tasks Keyboard Drag and Drop", () => {
  beforeEach(async () => {
    await prepareEmptyStorageForTests();
  });

  it("should render drag handles when there are multiple tasks", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add multiple tasks
    await addTasks(user, ["First task", "Second task"]);

    // Verify drag handles are rendered (the DotsSixVerticalIcon button)
    // The drag handle is an IconButton containing the DotsSixVerticalIcon
    const dragHandles = screen.getAllByRole("button", { name: /Reorder/i });
    expect(dragHandles.length).toBe(2);
  }, 10000);

  it("should not render drag handles when there is only one task", async () => {
    const { user } = renderWithDayProviders(<TaskList />);

    // Add only one task
    await addTasks(user, ["Single task"]);

    // Verify drag handles are rendered but hidden
    const dragHandle = screen.queryByRole("button", { name: /Reorder/i });

    expect(dragHandle).not.toBeInTheDocument();
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
  }, 10000);

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
    const descriptionElements = screen.getAllByText(
      "Press space to start dragging this task.",
    );
    const descriptionElement = descriptionElements.find(
      (el) => el.id === describedById,
    );
    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveClass("hidden");
  }, 10000);
});
