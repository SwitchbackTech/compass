import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { RenderOptions, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { getTaskRepository } from "@web/common/repositories/task/task.repository.util";
import { Task } from "@web/common/types/task.types";
import * as storageUtil from "@web/common/utils/storage/storage.util";
import { CompassRequiredProviders } from "@web/components/CompassProvider/CompassProvider";
import { useAvailableTasks } from "@web/views/Now/hooks/useAvailableTasks";
import { useFocusedTask } from "@web/views/Now/hooks/useFocusedTask";
import { NowViewProvider } from "../../context/NowViewProvider";
import { TaskSelector } from "./TaskSelector";

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("@web/views/Now/hooks/useFocusedTask");
jest.mock("@web/views/Now/hooks/useAvailableTasks");
jest.mock("@web/common/utils/storage/storage.util", () => ({
  ...jest.requireActual("@web/common/utils/storage/storage.util"),
  getDateKey: jest.fn(),
}));

jest.mock("@web/common/repositories/task/task.repository.util", () => {
  const mockSave = jest.fn().mockResolvedValue(undefined);
  return {
    getTaskRepository: jest.fn(() => ({
      save: mockSave,
    })),
  };
});

jest.mock("@web/common/storage/adapter/adapter", () => ({
  ensureStorageReady: jest.fn().mockResolvedValue(undefined),
}));

/** Get the save mock from the mocked getTaskRepository return value */
const getMockSave = () => (getTaskRepository as jest.Mock)().save as jest.Mock;

const mockUseFocusedTask = useFocusedTask as jest.MockedFunction<
  typeof useFocusedTask
>;
const mockUseAvailableTasks = useAvailableTasks as jest.MockedFunction<
  typeof useAvailableTasks
>;

const NowProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <CompassRequiredProviders>
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <NowViewProvider>{children}</NowViewProvider>
      </MemoryRouter>
    </CompassRequiredProviders>
  );
};

export const renderWithNowProvider = (
  component: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => {
  return render(component, { wrapper: NowProviders, ...options });
};

describe("TaskSelector", () => {
  const mockSetFocusedTask = jest.fn();
  const mockToday = dayjs("2025-11-15T00:00:00Z").utc();
  const mockDateKey = "2025-11-15";

  const mockTasks: Task[] = [
    createMockTask({
      _id: "task-1",
      title: "Test Task",
      status: "todo",
      order: 1,
      user: "user-1",
      createdAt: "2025-11-15T10:00:00Z",
    }),
    createMockTask({
      _id: "task-2",
      title: "Another Task",
      status: "todo",
      order: 2,
      user: "user-1",
      createdAt: "2025-11-15T11:00:00Z",
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockSetFocusedTask.mockClear();
    getMockSave().mockResolvedValue(undefined);
    (storageUtil.getDateKey as jest.Mock).mockReturnValue(mockDateKey);

    // Use fake timers to control the current time
    jest.useFakeTimers();
    jest.setSystemTime(mockToday.toDate());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders FocusedTask when a task is focused", () => {
    mockUseFocusedTask.mockReturnValue({
      focusedTask: mockTasks[0],
      setFocusedTask: mockSetFocusedTask,
    });
    mockUseAvailableTasks.mockReturnValue({
      availableTasks: [],
      allTasks: [],
      hasCompletedTasks: false,
    });

    renderWithNowProvider(<TaskSelector />);

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
      allTasks: mockTasks,
      hasCompletedTasks: false,
    });

    renderWithNowProvider(<TaskSelector />);

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
      allTasks: mockTasks,
      hasCompletedTasks: false,
    });

    renderWithNowProvider(<TaskSelector />);

    const taskElement = screen.getByRole("button", { name: /Test Task/i });
    expect(taskElement).toBeInTheDocument();

    await user.click(taskElement);

    // Clicking should focus the selected task
    expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
  });

  it("renders NoTaskAvailable when no tasks are available", () => {
    mockUseFocusedTask.mockReturnValue({
      focusedTask: null,
      setFocusedTask: mockSetFocusedTask,
    });
    mockUseAvailableTasks.mockReturnValue({
      availableTasks: [],
      allTasks: [],
      hasCompletedTasks: false,
    });

    renderWithNowProvider(<TaskSelector />);

    expect(
      screen.getByText("You don't have any task scheduled."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add tasks in the Day view to get started."),
    ).toBeInTheDocument();
    expect(screen.getByText("Go to Day view")).toBeInTheDocument();
  });

  it("renders AllTasksCompleted when all tasks are completed", () => {
    mockUseFocusedTask.mockReturnValue({
      focusedTask: null,
      setFocusedTask: mockSetFocusedTask,
    });
    mockUseAvailableTasks.mockReturnValue({
      availableTasks: [],
      allTasks: [
        {
          _id: "task-1",
          title: "Completed Task",
          status: "completed",
          createdAt: "2025-11-15T10:00:00Z",
          order: 1,
        },
      ],
      hasCompletedTasks: true,
    });

    renderWithNowProvider(<TaskSelector />);

    expect(
      screen.getByText("All tasks completed for today!"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Great work! Add more tasks in the Day view to keep going.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Go to Day view")).toBeInTheDocument();
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
      allTasks: mockTasks,
      hasCompletedTasks: false,
    });

    const { rerender } = renderWithNowProvider(<TaskSelector />);

    // Initially shows AvailableTasks
    expect(screen.getByText("Select a task to focus on")).toBeInTheDocument();
    expect(screen.getByText("Test Task")).toBeInTheDocument();

    // Select a task
    const taskElement = screen.getByRole("button", { name: /Test Task/i });
    expect(taskElement).toBeInTheDocument();

    await user.click(taskElement);

    // Verify setFocusedTask was called
    expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");

    // Update the mock to return focused task (simulating state update)
    mockUseFocusedTask.mockReturnValue({
      focusedTask: mockTasks[0],
      setFocusedTask: mockSetFocusedTask,
    });

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

  describe("Complete task behavior", () => {
    it("marks task as complete and navigates to next incomplete task when CheckCircle is clicked", async () => {
      const user = userEvent.setup({ delay: null });
      const tasks: Task[] = [
        createMockTask({
          _id: "task-1",
          title: "First Task",
          status: "todo",
          order: 1,
          user: "user-1",
          createdAt: "2025-11-15T10:00:00Z",
        }),
        createMockTask({
          _id: "task-2",
          title: "Second Task",
          status: "todo",
          order: 2,
          user: "user-1",
          createdAt: "2025-11-15T11:00:00Z",
        }),
        createMockTask({
          _id: "task-3",
          title: "Third Task",
          status: "todo",
          order: 3,
          user: "user-1",
          createdAt: "2025-11-15T12:00:00Z",
        }),
      ];

      mockUseFocusedTask.mockReturnValue({
        focusedTask: tasks[0],
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: tasks,
        allTasks: tasks,
        hasCompletedTasks: false,
      });
      renderWithNowProvider(<TaskSelector />);

      const checkButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });
      await user.click(checkButton);

      await waitFor(() => {
        expect(getMockSave()).toHaveBeenCalledTimes(1);
        expect(getMockSave()).toHaveBeenCalledWith(
          mockDateKey,
          expect.objectContaining({ _id: "task-1", status: "completed" }),
        );
        expect(mockSetFocusedTask).toHaveBeenCalledWith("task-2");
      });
    });

    it("marks task as complete and navigates to previous task when it's the last task", async () => {
      const user = userEvent.setup({ delay: null });
      const tasks: Task[] = [
        createMockTask({
          _id: "task-1",
          title: "First Task",
          status: "todo",
          order: 1,
          user: "user-1",
          createdAt: "2025-11-15T10:00:00Z",
        }),
        createMockTask({
          _id: "task-2",
          title: "Second Task",
          status: "todo",
          order: 2,
          user: "user-1",
          createdAt: "2025-11-15T11:00:00Z",
        }),
      ];

      mockUseFocusedTask.mockReturnValue({
        focusedTask: tasks[1], // Last task
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: tasks,
        allTasks: tasks,
        hasCompletedTasks: false,
      });

      renderWithNowProvider(<TaskSelector />);

      const checkButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });
      await user.click(checkButton);

      await waitFor(() => {
        expect(getMockSave()).toHaveBeenCalledTimes(1);
        expect(getMockSave()).toHaveBeenCalledWith(
          mockDateKey,
          expect.objectContaining({ _id: "task-2", status: "completed" }),
        );
        expect(mockSetFocusedTask).toHaveBeenCalledWith("task-1");
      });
    });

    it("marks task as complete and navigates to Day view when it's the only task", async () => {
      const user = userEvent.setup({ delay: null });
      const tasks: Task[] = [
        createMockTask({
          _id: "task-1",
          title: "Only Task",
          status: "todo",
          order: 1,
          user: "user-1",
          createdAt: "2025-11-15T10:00:00Z",
        }),
      ];

      mockUseFocusedTask.mockReturnValue({
        focusedTask: tasks[0],
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: tasks,
        allTasks: tasks,
        hasCompletedTasks: false,
      });

      renderWithNowProvider(<TaskSelector />);

      const checkButton = screen.getByRole("button", {
        name: "Mark task as complete",
      });
      await user.click(checkButton);

      await waitFor(() => {
        expect(getMockSave()).toHaveBeenCalledTimes(1);
        expect(getMockSave()).toHaveBeenCalledWith(
          mockDateKey,
          expect.objectContaining({ _id: "task-1", status: "completed" }),
        );
        expect(mockNavigate).toHaveBeenCalledWith("/day");
      });
    });

    it("does nothing when no task is focused", async () => {
      mockUseFocusedTask.mockReturnValue({
        focusedTask: null,
        setFocusedTask: mockSetFocusedTask,
      });
      mockUseAvailableTasks.mockReturnValue({
        availableTasks: mockTasks,
        allTasks: mockTasks,
        hasCompletedTasks: false,
      });

      renderWithNowProvider(<TaskSelector />);

      // Should not render the check button when no task is focused
      expect(
        screen.queryByRole("button", { name: "Mark task as complete" }),
      ).not.toBeInTheDocument();
    });
  });
});
