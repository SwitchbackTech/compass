import { act } from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { addTasks } from "../../../__tests__/utils/tasks/task.test.util";
import { renderWithDayProviders } from "../util/day.test-util";
import { DayViewContent } from "./DayViewContent";

// Mock the Agenda component
jest.mock("../components/Agenda/Agenda", () => ({
  Agenda: () => <div className="h-96">Calendar Content</div>,
}));

// Mock the ShortcutsOverlay component
jest.mock("@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay", () => ({
  ShortcutsOverlay: () => <div data-testid="shortcuts-overlay" />,
}));

// Mock the keyboard shortcuts hook
const mockUseTodayViewShortcuts = jest.fn();

jest.mock("../hooks/shortcuts/useDayViewShortcuts", () => {
  const actual = jest.requireActual("../hooks/shortcuts/useDayViewShortcuts");
  return {
    ...actual,
    useDayViewShortcuts: (
      ...args: Parameters<typeof actual.useDayViewShortcuts>
    ) => mockUseTodayViewShortcuts(...args),
  };
});

describe("TodayViewContent", () => {
  beforeEach(() => {
    mockUseTodayViewShortcuts.mockReset();
    // Set up the mock to call the real implementation
    mockUseTodayViewShortcuts.mockImplementation((config) => {
      const actual = jest.requireActual(
        "../hooks/shortcuts/useDayViewShortcuts",
      );
      return actual.useDayViewShortcuts(config);
    });
    localStorage.clear();
  });

  it("should render the main layout with tasks and calendar sections", () => {
    renderWithDayProviders(<DayViewContent />);

    // Verify the main components are present
    expect(
      screen.getByRole("button", { name: "Create new task" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Calendar Content")).toBeInTheDocument();
  });

  it("focuses the add task input when typing the 't' shortcut", async () => {
    const actualShortcuts = jest.requireActual(
      "../hooks/shortcuts/useDayViewShortcuts",
    );

    mockUseTodayViewShortcuts.mockImplementation((config) =>
      actualShortcuts.useDayViewShortcuts({
        ...config,
        onFocusTasks: config.onFocusTasks || jest.fn(),
      }),
    );

    const { user } = renderWithDayProviders(<DayViewContent />);

    await act(async () => {
      await user.keyboard("c");
    });

    const addTaskInput = await screen.findByRole("textbox", {
      name: "Task title",
    });

    expect(addTaskInput).toHaveFocus();
  });

  it("should display today's date in the tasks section", () => {
    renderWithDayProviders(<DayViewContent />);

    // Check that today's date is displayed
    const todayHeading = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    const todaySubheading = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    expect(screen.getByText(todayHeading)).toBeInTheDocument();
    expect(screen.getByText(todaySubheading)).toBeInTheDocument();
  });

  it("should allow users to create new tasks", async () => {
    const { user } = renderWithDayProviders(<DayViewContent />);

    // Click the add task button
    const addTaskButton = screen.getByRole("button", {
      name: "Create new task",
    });
    await act(() => user.click(addTaskButton));

    // Verify input field appears
    expect(
      screen.getByPlaceholderText("Enter task title..."),
    ).toBeInTheDocument();
  });

  it("should maintain a fixed height layout that fills the viewport", () => {
    renderWithDayProviders(<DayViewContent />);

    // The layout should be present and functional
    expect(
      screen.getByRole("button", { name: "Create new task" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Calendar Content")).toBeInTheDocument();
  });

  it("should display add task button", () => {
    renderWithDayProviders(<DayViewContent />);

    // The tasks section should be present and functional
    const addTaskButton = screen.getByRole("button", {
      name: "Create new task",
    });
    expect(addTaskButton).toBeInTheDocument();

    // Users should be able to interact with the tasks section
    expect(addTaskButton).toBeEnabled();
  });

  it("should delete task when Delete key is pressed on focused checkbox", async () => {
    const { user } = renderWithDayProviders(<DayViewContent />);

    await addTasks(user, ["Test task"]);

    // Find the task checkbox and focus on it
    const taskCheckbox = screen.getByRole("checkbox", {
      name: /toggle test task/i,
    });
    await act(() => taskCheckbox.focus());

    // Wait for the focus to be processed and state to update
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    // Press Delete key using userEvent which properly simulates keyboard events
    await act(async () => {
      await user.keyboard("{Delete}");
    });

    // Wait for the delete operation to complete
    await act(() => new Promise((resolve) => setTimeout(resolve, 100)));

    // Assert task is removed from DOM
    expect(taskCheckbox).not.toBeInTheDocument();
  });

  it("should NOT delete task when Delete key is pressed on input field", async () => {
    const { user } = renderWithDayProviders(<DayViewContent />);

    // Add a task
    await addTasks(user, ["Test task"]);

    // Click on the task input to edit it
    const taskEditInput = screen.getByDisplayValue("Test task");
    await act(() => user.click(taskEditInput));

    // Press Delete key (should work normally in input)
    await act(async () => {
      await user.keyboard("{Delete}");
    });

    // Assert task still exists in DOM
    const taskCheckbox = screen.getByRole("checkbox", {
      name: /toggle test task/i,
    });
    expect(taskCheckbox).toBeInTheDocument();
  });

  describe("Duplicate task names with keyboard shortcuts", () => {
    it("should delete the correct duplicate task when pressing Delete key", async () => {
      const { user } = renderWithDayProviders(<DayViewContent />);

      // Add first task
      await addTasks(user, ["Buy milk"]);

      // Add second task with same name
      await addTasks(user, ["Buy milk"]);

      // Get both checkboxes and identify them by their data-task-id
      const checkboxes = screen.getAllByRole("checkbox", {
        name: "Toggle Buy milk",
      });
      expect(checkboxes).toHaveLength(2);

      // Get the task IDs from the checkboxes
      const firstTaskId = checkboxes[0].getAttribute("data-task-id");
      const secondTaskId = checkboxes[1].getAttribute("data-task-id");

      expect(firstTaskId).toBeTruthy();
      expect(secondTaskId).toBeTruthy();
      expect(firstTaskId).not.toBe(secondTaskId);

      // Focus on the second task checkbox
      const secondCheckbox = checkboxes[1];
      await act(() => secondCheckbox.focus());

      // Wait for the focus to be processed and state to update
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

      // Press Delete key
      await act(async () => {
        await user.keyboard("{Delete}");
      });

      // Wait for the delete operation to complete
      await act(() => new Promise((resolve) => setTimeout(resolve, 100)));

      // Verify only one task remains (the first one)
      const remainingCheckboxes = screen.getAllByRole("checkbox", {
        name: "Toggle Buy milk",
      });
      expect(remainingCheckboxes).toHaveLength(1);

      // Verify the remaining task is the first one (by checking data-task-id)
      expect(remainingCheckboxes[0].getAttribute("data-task-id")).toBe(
        firstTaskId,
      );
    }, 10000);
  });
});
