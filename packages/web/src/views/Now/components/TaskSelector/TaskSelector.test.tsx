import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/views/Day/task.types";
import * as storageUtil from "@web/views/Day/util/storage.util";
import { useAvailableTasks } from "@web/views/Now/hooks/useAvailableTasks";
import { useFocusedTask } from "@web/views/Now/hooks/useFocusedTask";
import { TaskSelector } from "./TaskSelector";

jest.mock("@web/views/Now/hooks/useFocusedTask");
jest.mock("@web/views/Now/hooks/useAvailableTasks");
jest.mock("@web/views/Day/util/storage.util", () => ({
  ...jest.requireActual("@web/views/Day/util/storage.util"),
  getDateKey: jest.fn(),
  loadTasksFromStorage: jest.fn(),
  saveTasksToStorage: jest.fn(),
}));

const mockUseFocusedTask = useFocusedTask as jest.MockedFunction<
  typeof useFocusedTask
>;
const mockUseAvailableTasks = useAvailableTasks as jest.MockedFunction<
  typeof useAvailableTasks
>;

describe("TaskSelector", () => {
  const mockSetFocusedTask = jest.fn();
  const mockToday = dayjs("2025-11-15T00:00:00Z").utc();
  const mockDateKey = "2025-11-15";

  const mockTask: Task = {
    id: "task-1",
    title: "Test Task",
    status: "todo",
    createdAt: "2025-11-15T10:00:00Z",
  };

  const mockTasks: Task[] = [
    mockTask,
    {
      id: "task-2",
      title: "Another Task",
      status: "todo",
      createdAt: "2025-11-15T11:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetFocusedTask.mockClear();
    (storageUtil.getDateKey as jest.Mock).mockReturnValue(mockDateKey);
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(mockTasks);
    (storageUtil.saveTasksToStorage as jest.Mock).mockImplementation(() => {});

    // Use fake timers to control the current time
    jest.useFakeTimers();
    jest.setSystemTime(mockToday.toDate());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders FocusedTask when a task is focused", () => {
    mockUseFocusedTask.mockReturnValue({
      focusedTask: mockTask,
      setFocusedTask: mockSetFocusedTask,
    });
    mockUseAvailableTasks.mockReturnValue({
      availableTasks: [],
    });

    render(<TaskSelector />);

    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(
      screen.queryByText("Select a task to focus on"),
    ).not.toBeInTheDocument();
  });

  it("renders AvailableTasks when no task is focused", () => {
    mockUseFocusedTask.mockReturnValue({
      focusedTask: null,
      setFocusedTask: mockSetFocusedTask,
    });
    mockUseAvailableTasks.mockReturnValue({
      availableTasks: mockTasks,
    });

    render(<TaskSelector />);

    expect(screen.getByText("Select a task to focus on")).toBeInTheDocument();
    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByText("Another Task")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("calls setFocusedTask when a task is selected", async () => {
    const user = userEvent.setup({ delay: null });

    // Initially no task is focused
    mockUseFocusedTask.mockReturnValue({
      focusedTask: null,
      setFocusedTask: mockSetFocusedTask,
    });
    mockUseAvailableTasks.mockReturnValue({
      availableTasks: mockTasks,
    });

    render(<TaskSelector />);

    // Wait for auto-focus to complete
    await waitFor(() => {
      expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
    });

    mockSetFocusedTask.mockClear();

    const taskElement = screen
      .getByText("Test Task")
      .closest('[role="button"]');
    expect(taskElement).toBeInTheDocument();

    await user.click(taskElement!);

    // After auto-focus, clicking should call setFocusedTask again
    expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
    expect(mockSetFocusedTask).toHaveBeenCalledTimes(1);
  });

  it("renders empty state when no tasks are available", () => {
    mockUseFocusedTask.mockReturnValue({
      focusedTask: null,
      setFocusedTask: mockSetFocusedTask,
    });
    mockUseAvailableTasks.mockReturnValue({
      availableTasks: [],
    });

    render(<TaskSelector />);

    expect(screen.getByText("No tasks available")).toBeInTheDocument();
    expect(
      screen.getByText("Create tasks in the Day view to focus on them here"),
    ).toBeInTheDocument();
  });

  it("switches from AvailableTasks to FocusedTask when task is selected", async () => {
    const user = userEvent.setup({ delay: null });

    // Initially no task is focused
    mockUseFocusedTask.mockReturnValue({
      focusedTask: null,
      setFocusedTask: mockSetFocusedTask,
    });
    mockUseAvailableTasks.mockReturnValue({
      availableTasks: mockTasks,
    });

    const { rerender } = render(<TaskSelector />);

    // Initially shows AvailableTasks
    expect(screen.getByText("Select a task to focus on")).toBeInTheDocument();
    expect(screen.getByText("Test Task")).toBeInTheDocument();

    // Select a task
    const taskElement = screen
      .getByText("Test Task")
      .closest('[role="button"]');
    expect(taskElement).toBeInTheDocument();

    await user.click(taskElement!);

    // Verify setFocusedTask was called
    expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");

    // Update the mock to return focused task (simulating state update)
    mockUseFocusedTask.mockReturnValue({
      focusedTask: mockTask,
      setFocusedTask: mockSetFocusedTask,
    });

    // Rerender with updated mock
    rerender(<TaskSelector />);

    // Now shows FocusedTask
    await waitFor(() => {
      expect(
        screen.queryByText("Select a task to focus on"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Test Task")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  describe("auto-focus behavior", () => {
    it("auto-focuses on the first incomplete task when no task is focused", async () => {
      mockUseFocusedTask.mockReturnValue({
        focusedTask: null,
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: mockTasks,
      });

      render(<TaskSelector />);

      await waitFor(() => {
        expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
        expect(mockSetFocusedTask).toHaveBeenCalledTimes(1);
      });
    });

    it("does not auto-focus when a task is already focused", async () => {
      mockUseFocusedTask.mockReturnValue({
        focusedTask: mockTask,
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: mockTasks,
      });

      render(<TaskSelector />);

      await waitFor(() => {
        expect(mockSetFocusedTask).not.toHaveBeenCalled();
      });
    });

    it("does not auto-focus when no tasks are available", async () => {
      mockUseFocusedTask.mockReturnValue({
        focusedTask: null,
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: [],
      });

      render(<TaskSelector />);

      await waitFor(() => {
        expect(mockSetFocusedTask).not.toHaveBeenCalled();
      });
    });

    it("auto-focuses on the first task when available tasks change from empty to non-empty", async () => {
      mockUseFocusedTask.mockReturnValue({
        focusedTask: null,
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks
        .mockReturnValueOnce({
          availableTasks: [],
        })
        .mockReturnValueOnce({
          availableTasks: mockTasks,
        });

      const { rerender } = render(<TaskSelector />);

      await waitFor(() => {
        expect(mockSetFocusedTask).not.toHaveBeenCalled();
      });

      mockSetFocusedTask.mockClear();

      rerender(<TaskSelector />);

      await waitFor(() => {
        expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
        expect(mockSetFocusedTask).toHaveBeenCalledTimes(1);
      });
    });

    it("does not auto-focus when focused task becomes null but tasks were already available", async () => {
      // First render with a focused task
      mockUseFocusedTask.mockReturnValue({
        focusedTask: mockTask,
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: mockTasks,
      });

      const { rerender } = render(<TaskSelector />);

      await waitFor(() => {
        expect(mockSetFocusedTask).not.toHaveBeenCalled();
      });

      mockSetFocusedTask.mockClear();

      // Now change to no focused task
      mockUseFocusedTask.mockReturnValue({
        focusedTask: null,
        setFocusedTask: mockSetFocusedTask,
      });

      rerender(<TaskSelector />);

      await waitFor(() => {
        // Should auto-focus when focusedTask becomes null
        expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
        expect(mockSetFocusedTask).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Complete task behavior", () => {
    it("marks task as complete and navigates to next incomplete task when CheckCircle is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "First Task",
          status: "todo",
          createdAt: "2025-11-15T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Second Task",
          status: "todo",
          createdAt: "2025-11-15T11:00:00Z",
        },
        {
          id: "task-3",
          title: "Third Task",
          status: "todo",
          createdAt: "2025-11-15T12:00:00Z",
        },
      ];

      mockUseFocusedTask.mockReturnValue({
        focusedTask: tasks[0],
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: tasks,
      });
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(tasks);

      render(<TaskSelector />);

      const checkButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });
      await user.click(checkButton);

      // Verify task was marked as completed
      expect(storageUtil.loadTasksFromStorage).toHaveBeenCalledWith(
        mockDateKey,
      );
      expect(storageUtil.saveTasksToStorage).toHaveBeenCalledWith(
        mockDateKey,
        expect.arrayContaining([
          expect.objectContaining({
            id: "task-1",
            status: "completed",
          }),
        ]),
      );

      // Verify navigation to next task
      expect(mockSetFocusedTask).toHaveBeenCalledWith("task-2");
    });

    it("marks task as complete and navigates to previous task when it's the last task", async () => {
      const user = userEvent.setup({ delay: null });
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "First Task",
          status: "todo",
          createdAt: "2025-11-15T10:00:00Z",
        },
        {
          id: "task-2",
          title: "Second Task",
          status: "todo",
          createdAt: "2025-11-15T11:00:00Z",
        },
      ];

      mockUseFocusedTask.mockReturnValue({
        focusedTask: tasks[1], // Last task
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: tasks,
      });
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(tasks);

      render(<TaskSelector />);

      const checkButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });
      await user.click(checkButton);

      // Verify task was marked as completed
      expect(storageUtil.saveTasksToStorage).toHaveBeenCalledWith(
        mockDateKey,
        expect.arrayContaining([
          expect.objectContaining({
            id: "task-2",
            status: "completed",
          }),
        ]),
      );

      // Verify navigation to previous task
      expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
    });

    it("marks task as complete and clears focus when it's the only task", async () => {
      const user = userEvent.setup({ delay: null });
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Only Task",
          status: "todo",
          createdAt: "2025-11-15T10:00:00Z",
        },
      ];

      mockUseFocusedTask.mockReturnValue({
        focusedTask: tasks[0],
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: tasks,
      });
      (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue(tasks);

      render(<TaskSelector />);

      const checkButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });
      await user.click(checkButton);

      // Verify task was marked as completed
      expect(storageUtil.saveTasksToStorage).toHaveBeenCalledWith(
        mockDateKey,
        expect.arrayContaining([
          expect.objectContaining({
            id: "task-1",
            status: "completed",
          }),
        ]),
      );

      // Verify focus is cleared
      expect(mockSetFocusedTask).toHaveBeenCalledWith(null);
    });

    it("does nothing when no task is focused", async () => {
      mockUseFocusedTask.mockReturnValue({
        focusedTask: null,
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: mockTasks,
      });

      render(<TaskSelector />);

      // Should not render the check button when no task is focused
      expect(
        screen.queryByRole("button", { name: "Mark task as complete" }),
      ).not.toBeInTheDocument();
    });
  });
});
