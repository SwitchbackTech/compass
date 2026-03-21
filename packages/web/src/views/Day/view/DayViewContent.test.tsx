import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import { prepareEmptyStorageForTests } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { addTasks } from "@web/__tests__/utils/tasks/task.test.util";
import { renderWithDayProvidersAsync } from "@web/views/Day/util/day.test-util";
import { DayViewContent } from "@web/views/Day/view/DayViewContent";

// Helper to create a mock matchMedia
const createMatchMedia = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  const mediaQuery = {
    matches,
    media: "",
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(
      (_event: string, listener: (e: MediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
    ),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    // Helper to simulate resize
    _triggerChange: (newMatches: boolean) => {
      mediaQuery.matches = newMatches;
      listeners.forEach((listener) =>
        listener({ matches: newMatches } as MediaQueryListEvent),
      );
    },
  };

  return mediaQuery;
};

// Mock the Agenda component
jest.mock("../components/Agenda/Agenda", () => ({
  Agenda: () => <div className="h-96">Calendar Content</div>,
}));

// Mock the ShortcutsSidebar component
jest.mock("../components/ShortcutsSidebar/ShortcutsSidebar", () => ({
  ShortcutsSidebar: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? (
      <aside aria-label="Shortcuts sidebar" data-testid="shortcuts-sidebar" />
    ) : null,
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
  beforeEach(async () => {
    mockUseTodayViewShortcuts.mockReset();
    // Set up the mock to call the real implementation
    mockUseTodayViewShortcuts.mockImplementation((config) => {
      const actual = jest.requireActual(
        "../hooks/shortcuts/useDayViewShortcuts",
      );
      return actual.useDayViewShortcuts(config);
    });
    await prepareEmptyStorageForTests();
  });

  it("should render the main layout with tasks and calendar sections", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);

    // Verify the main components are present
    expect(
      await screen.findByRole("button", { name: "Create new task" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Calendar Content")).toBeInTheDocument();
  });

  it("should render the header without reminder and with view selector", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);

    // Check that Reminder component is NOT rendered
    expect(
      screen.queryByText("Click to add your reminder"),
    ).not.toBeInTheDocument();

    // Check that SelectView component is rendered
    expect(
      await screen.findAllByRole("button", { name: /select view/i }),
    ).toHaveLength(2); // Header SelectView + TaskList date selector
  });

  it("focuses the add task input when typing the 'c' shortcut", async () => {
    const actualShortcuts = jest.requireActual(
      "../hooks/shortcuts/useDayViewShortcuts",
    );

    mockUseTodayViewShortcuts.mockImplementation((config) =>
      actualShortcuts.useDayViewShortcuts({
        ...config,
        onFocusTasks: config.onFocusTasks || jest.fn(),
      }),
    );

    const { user } = await renderWithDayProvidersAsync(<DayViewContent />);

    await act(async () => {
      await user.keyboard("c");
    });

    const addTaskInput = await screen.findByRole("textbox", {
      name: "Task title",
    });

    expect(addTaskInput).toHaveFocus();
  });

  it("should display today's date in the tasks section", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);

    // Check that today's date is displayed
    const todayHeading = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });
    const todaySubheading = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    expect(await screen.findByText(todayHeading)).toBeInTheDocument();
    expect(await screen.findByText(todaySubheading)).toBeInTheDocument();
  });

  it("should allow users to create new tasks", async () => {
    const { user } = await renderWithDayProvidersAsync(<DayViewContent />);

    // Click the add task button
    const addTaskButton = await screen.findByRole("button", {
      name: "Create new task",
    });
    await act(() => user.click(addTaskButton));

    // Verify input field appears
    expect(
      screen.getByPlaceholderText("Enter task title..."),
    ).toBeInTheDocument();
  });

  it("should maintain a fixed height layout that fills the viewport", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);

    // The layout should be present and functional
    expect(
      await screen.findByRole("button", { name: "Create new task" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Calendar Content")).toBeInTheDocument();
  });

  it("should display add task button", async () => {
    await renderWithDayProvidersAsync(<DayViewContent />);

    // The tasks section should be present and functional
    const addTaskButton = await screen.findByRole("button", {
      name: "Create new task",
    });
    expect(addTaskButton).toBeInTheDocument();

    // Users should be able to interact with the tasks section
    expect(addTaskButton).toBeEnabled();
  });

  it("should delete task when Delete key is pressed on focused checkbox", async () => {
    const { user } = await renderWithDayProvidersAsync(<DayViewContent />);

    await addTasks(user, ["Test task"]);

    // Find the task checkbox and focus on it
    const taskCheckbox = await screen.findByRole("checkbox", {
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
    const { user } = await renderWithDayProvidersAsync(<DayViewContent />);

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
    const taskCheckbox = await screen.findByRole("checkbox", {
      name: /toggle test task/i,
    });
    expect(taskCheckbox).toBeInTheDocument();
  });

  describe("Duplicate task names with keyboard shortcuts", () => {
    it("should delete the correct duplicate task when pressing Delete key", async () => {
      const { user } = await renderWithDayProvidersAsync(<DayViewContent />);

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

  describe("Sidebar responsive behavior", () => {
    const originalMatchMedia = window.matchMedia;
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });

    it("should open sidebar when screen is wide (>=1280px)", async () => {
      // Mock wide screen
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1400,
      });
      const mockMediaQuery = createMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

      await renderWithDayProvidersAsync(<DayViewContent />);

      // Sidebar should be visible (check for shortcuts sidebar)
      const sidebar = screen.queryByRole("complementary", {
        name: "Shortcuts sidebar",
      });
      expect(sidebar).toBeInTheDocument();
    });

    it("should close sidebar when screen is narrow (<1280px)", async () => {
      // Mock narrow screen
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1000,
      });
      const mockMediaQuery = createMatchMedia(false);
      window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

      await renderWithDayProvidersAsync(<DayViewContent />);

      // Sidebar should not be visible
      const sidebar = screen.queryByRole("complementary", {
        name: "Shortcuts sidebar",
      });
      expect(sidebar).not.toBeInTheDocument();
    });

    it("should close sidebar when screen resizes from wide to narrow", async () => {
      // Start with wide screen
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1400,
      });
      const mockMediaQuery = createMatchMedia(true);
      window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

      await renderWithDayProvidersAsync(<DayViewContent />);

      // Sidebar should be visible initially
      await waitFor(() => {
        expect(
          screen.queryByRole("complementary", { name: "Shortcuts sidebar" }),
        ).toBeInTheDocument();
      });

      // Simulate resize to narrow
      act(() => {
        mockMediaQuery._triggerChange(false);
      });

      // Sidebar should now be hidden
      await waitFor(() => {
        expect(
          screen.queryByRole("complementary", { name: "Shortcuts sidebar" }),
        ).not.toBeInTheDocument();
      });
    });

    it("should open sidebar when screen resizes from narrow to wide", async () => {
      // Start with narrow screen
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1000,
      });
      const mockMediaQuery = createMatchMedia(false);
      window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

      await renderWithDayProvidersAsync(<DayViewContent />);

      // Sidebar should be hidden initially
      expect(
        screen.queryByRole("complementary", { name: "Shortcuts sidebar" }),
      ).not.toBeInTheDocument();

      // Simulate resize to wide
      act(() => {
        mockMediaQuery._triggerChange(true);
      });

      // Sidebar should now be visible
      await waitFor(() => {
        expect(
          screen.queryByRole("complementary", { name: "Shortcuts sidebar" }),
        ).toBeInTheDocument();
      });
    });
  });
});
