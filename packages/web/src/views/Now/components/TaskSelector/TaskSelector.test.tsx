import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Task } from "@web/views/Day/task.types";
import { useAvailableTasks } from "@web/views/Now/hooks/useAvailableTasks";
import { useFocusedTask } from "@web/views/Now/hooks/useFocusedTask";
import { TaskSelector } from "./TaskSelector";

jest.mock("@web/views/Now/hooks/useFocusedTask");
jest.mock("@web/views/Now/hooks/useAvailableTasks");

const mockUseFocusedTask = useFocusedTask as jest.MockedFunction<
  typeof useFocusedTask
>;
const mockUseAvailableTasks = useAvailableTasks as jest.MockedFunction<
  typeof useAvailableTasks
>;

describe("TaskSelector", () => {
  const mockSetFocusedTask = jest.fn();

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
    const user = userEvent.setup();
    let focusedTask: Task | null = null;

    mockUseFocusedTask.mockImplementation(() => ({
      focusedTask,
      setFocusedTask: (taskId: string | null) => {
        if (taskId) {
          focusedTask = mockTask;
          mockUseFocusedTask.mockReturnValue({
            focusedTask: mockTask,
            setFocusedTask: mockSetFocusedTask,
          });
        }
        mockSetFocusedTask(taskId);
      },
    }));
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
    const user = userEvent.setup();
    let focusedTask: Task | null = null;

    mockUseFocusedTask.mockImplementation(() => ({
      focusedTask,
      setFocusedTask: (taskId: string | null) => {
        if (taskId) {
          focusedTask = mockTask;
          // Re-render with updated state
          mockUseFocusedTask.mockReturnValue({
            focusedTask: mockTask,
            setFocusedTask: mockSetFocusedTask,
          });
        } else {
          focusedTask = null;
          mockUseFocusedTask.mockReturnValue({
            focusedTask: null,
            setFocusedTask: mockSetFocusedTask,
          });
        }
        mockSetFocusedTask(taskId);
      },
    }));

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
    await user.click(taskElement!);

    // Update the mock to return focused task
    mockUseFocusedTask.mockReturnValue({
      focusedTask: mockTask,
      setFocusedTask: mockSetFocusedTask,
    });

    rerender(<TaskSelector />);

    // Now shows FocusedTask
    expect(
      screen.queryByText("Select a task to focus on"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Test Task")).toBeInTheDocument();
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
});
