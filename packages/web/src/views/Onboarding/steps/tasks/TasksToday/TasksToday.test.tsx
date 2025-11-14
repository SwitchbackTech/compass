import { act } from "react";
import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { Task } from "@web/views/Day/task.types";
import { withOnboardingProvider } from "../../../components/OnboardingContext";
import { TasksToday } from "./TasksToday";
import { useTasksToday } from "./useTasksToday";

// Wrap the component with OnboardingProvider
const TasksTodayWithProvider = withOnboardingProvider(
  TasksToday as React.ComponentType<unknown>,
);

// Mock the useTasksToday hook
jest.mock("./useTasksToday", () => ({
  useTasksToday: jest.fn(),
}));

// Mock StaticAgenda
jest.mock("./StaticAgenda", () => ({
  StaticAgenda: () => <div data-testid="static-agenda">Static Agenda</div>,
}));

// Mock OnboardingStep to avoid needing OnboardingProvider
jest.mock("../../../components/OnboardingStep", () => ({
  OnboardingStep: () => <div data-testid="onboarding-step">Step 1 of 3</div>,
}));

// Mock dayjs to use a fixed date for consistent testing
jest.mock("@core/util/date/dayjs", () => {
  const { default: originalDayjs } = jest.requireActual(
    "@core/util/date/dayjs",
  );

  const mockDate = "2025-01-01T00:00:00Z"; // Monday, January 1, 2025

  const mockDayjs = (date?: unknown) => {
    if (date === undefined) {
      return originalDayjs(mockDate);
    }
    return originalDayjs(date);
  };
  Object.assign(mockDayjs, originalDayjs);
  return mockDayjs;
});

const mockUseTasksToday = useTasksToday as jest.MockedFunction<
  typeof useTasksToday
>;

describe("TasksToday", () => {
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();
  const mockOnSkip = jest.fn();
  const mockOnNavigationControlChange = jest.fn();

  const defaultProps = {
    currentStep: 1,
    totalSteps: 3,
    onNext: mockOnNext,
    onPrevious: mockOnPrevious,
    onSkip: mockOnSkip,
    onComplete: jest.fn(),
    onNavigationControlChange: mockOnNavigationControlChange,
    isNavPrevented: false,
  };

  const defaultHookReturn = {
    isTaskCreated: false,
    tasks: [
      {
        id: "task-1",
        title: "Review project proposal",
        status: "todo" as const,
        createdAt: new Date().toISOString(),
      },
      {
        id: "task-2",
        title: "Write weekly report",
        status: "todo" as const,
        createdAt: new Date().toISOString(),
      },
    ],
    newTask: "",
    handleNext: jest.fn(),
    handleAddTask: jest.fn(),
    handleTaskKeyPress: jest.fn(),
    setNewTask: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTasksToday.mockReturnValue(defaultHookReturn);
  });

  describe("Component Rendering", () => {
    it("renders the component with correct step information", () => {
      render(<TasksTodayWithProvider {...defaultProps} />);

      expect(
        screen.getByText("What do you need to do today?"),
      ).toBeInTheDocument();
      expect(screen.getByText("Add a task below")).toBeInTheDocument();
    });

    it("renders the date header", () => {
      render(<TasksTodayWithProvider {...defaultProps} />);

      // Check that date header elements exist (day name and date)
      // The exact values depend on timezone handling, so we check for presence
      const dateHeader = screen.getByRole("heading", { level: 2 });
      expect(dateHeader).toBeInTheDocument();
      expect(dateHeader.textContent).toBeTruthy();

      const dateSubheader = document.querySelector("p");
      expect(dateSubheader).toBeInTheDocument();
      expect(dateSubheader?.textContent).toBeTruthy();
    });

    it("renders existing tasks", () => {
      render(<TasksTodayWithProvider {...defaultProps} />);

      expect(screen.getByText("Review project proposal")).toBeInTheDocument();
      expect(screen.getByText("Write weekly report")).toBeInTheDocument();
    });

    it("renders the task input when tasks are less than 5", () => {
      render(<TasksTodayWithProvider {...defaultProps} />);

      const taskInput = screen.getByPlaceholderText("Create new task...");
      expect(taskInput).toBeInTheDocument();
    });

    it("does not render task input when tasks reach 5", () => {
      const tasksWithLimit: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: "todo" as const,
        createdAt: new Date().toISOString(),
      }));

      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        tasks: tasksWithLimit,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const taskInput = screen.queryByPlaceholderText("Create new task...");
      expect(taskInput).not.toBeInTheDocument();
    });

    it("renders the static agenda", () => {
      render(<TasksTodayWithProvider {...defaultProps} />);

      expect(screen.getByTestId("static-agenda")).toBeInTheDocument();
      expect(screen.getByText("Agenda")).toBeInTheDocument();
    });

    it("renders success message when task is created", () => {
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        isTaskCreated: true,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      expect(
        screen.getByText(
          /Great! You've created a task. You can add more and continue when you're done./,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("What do you need to do today?"),
      ).not.toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("calls setNewTask when input value changes", async () => {
      const mockSetNewTask = jest.fn();
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        setNewTask: mockSetNewTask,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const taskInput = screen.getByPlaceholderText("Create new task...");
      await act(async () => {
        await userEvent.type(taskInput, "New task");
      });

      expect(mockSetNewTask).toHaveBeenCalled();
    });

    it("calls handleTaskKeyPress when Enter is pressed", async () => {
      const mockHandleTaskKeyPress = jest.fn();
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        handleTaskKeyPress: mockHandleTaskKeyPress,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const taskInput = screen.getByPlaceholderText("Create new task...");
      await act(async () => {
        await userEvent.type(taskInput, "Test{enter}");
      });

      expect(mockHandleTaskKeyPress).toHaveBeenCalled();
    });

    it("calls handleAddTask when input loses focus with text", async () => {
      const mockHandleAddTask = jest.fn();
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        newTask: "Test task",
        handleAddTask: mockHandleAddTask,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const taskInput = screen.getByPlaceholderText("Create new task...");
      await act(async () => {
        await userEvent.click(taskInput);
        await userEvent.tab(); // Move focus away
      });

      expect(mockHandleAddTask).toHaveBeenCalled();
    });

    it("calls handleNext when next button is clicked", async () => {
      const mockHandleNext = jest.fn();
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        isTaskCreated: true,
        handleNext: mockHandleNext,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const nextButton = screen.getByLabelText("Next");
      await act(async () => {
        await userEvent.click(nextButton);
      });

      expect(mockHandleNext).toHaveBeenCalled();
    });
  });

  describe("Autofocus Functionality", () => {
    it("focuses input when component mounts with tasks.length < 5", () => {
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        tasks: [],
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const taskInput = screen.getByPlaceholderText("Create new task...");
      expect(taskInput).toHaveFocus();
    });

    it("focuses input when tasks.length is less than 5", () => {
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        tasks: [
          {
            id: "task-1",
            title: "Task 1",
            status: "todo" as const,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const taskInput = screen.getByPlaceholderText("Create new task...");
      expect(taskInput).toHaveFocus();
    });

    it("focuses input when tasks.length changes from >= 5 to < 5", () => {
      const tasksWithLimit: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: "todo" as const,
        createdAt: new Date().toISOString(),
      }));

      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        tasks: tasksWithLimit,
      });

      const { rerender } = render(<TasksTodayWithProvider {...defaultProps} />);

      // Input should not be rendered when tasks.length === 5
      expect(
        screen.queryByPlaceholderText("Create new task..."),
      ).not.toBeInTheDocument();

      // Now reduce tasks to less than 5
      const reducedTasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          status: "todo" as const,
          createdAt: new Date().toISOString(),
        },
      ];

      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        tasks: reducedTasks,
      });

      rerender(<TasksTodayWithProvider {...defaultProps} />);

      const taskInput = screen.getByPlaceholderText("Create new task...");
      expect(taskInput).toBeInTheDocument();
      expect(taskInput).toHaveFocus();
    });

    it("does not focus input when tasks.length >= 5", () => {
      const tasksWithLimit: Task[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: "todo" as const,
        createdAt: new Date().toISOString(),
      }));

      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        tasks: tasksWithLimit,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      // Input should not be rendered when tasks.length >= 5
      expect(
        screen.queryByPlaceholderText("Create new task..."),
      ).not.toBeInTheDocument();
    });
  });

  describe("Navigation Control", () => {
    it("disables next button when task is not created", () => {
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        isTaskCreated: false,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const nextButton = screen.getByLabelText("Next");
      expect(nextButton).toBeDisabled();
    });

    it("enables next button when task is created", () => {
      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        isTaskCreated: true,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      const nextButton = screen.getByLabelText("Next");
      expect(nextButton).not.toBeDisabled();
    });

    it("calls onNavigationControlChange through hook", () => {
      render(<TasksTodayWithProvider {...defaultProps} />);

      expect(mockUseTasksToday).toHaveBeenCalledWith({
        onNext: mockOnNext,
        onNavigationControlChange: mockOnNavigationControlChange,
      });
    });
  });

  describe("Props Handling", () => {
    it("passes correct props to OnboardingTwoRowLayout", () => {
      render(<TasksTodayWithProvider {...defaultProps} />);

      // Verify the layout receives the correct props by checking rendered content
      expect(screen.getByLabelText("Next")).toBeInTheDocument();
      expect(screen.getByLabelText("Previous")).toBeInTheDocument();
    });

    it("handles isNavPrevented prop", () => {
      render(<TasksToday {...defaultProps} isNavPrevented={true} />);

      // Component should still render
      expect(
        screen.getByText("What do you need to do today?"),
      ).toBeInTheDocument();
    });
  });

  describe("Task Display", () => {
    it("displays all tasks in the list", () => {
      const tasks: Task[] = [
        {
          id: "task-1",
          title: "Task 1",
          status: "todo",
          createdAt: new Date().toISOString(),
        },
        {
          id: "task-2",
          title: "Task 2",
          status: "todo",
          createdAt: new Date().toISOString(),
        },
        {
          id: "task-3",
          title: "Task 3",
          status: "todo",
          createdAt: new Date().toISOString(),
        },
      ];

      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        tasks,
      });

      render(<TasksTodayWithProvider {...defaultProps} />);

      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
      expect(screen.getByText("Task 3")).toBeInTheDocument();
    });

    it("updates task list when tasks change", () => {
      const { rerender } = render(<TasksToday {...defaultProps} />);

      expect(screen.getByText("Review project proposal")).toBeInTheDocument();

      const newTasks: Task[] = [
        {
          id: "task-new",
          title: "New Task",
          status: "todo",
          createdAt: new Date().toISOString(),
        },
      ];

      mockUseTasksToday.mockReturnValue({
        ...defaultHookReturn,
        tasks: newTasks,
      });

      rerender(<TasksToday {...defaultProps} />);

      expect(screen.getByText("New Task")).toBeInTheDocument();
      expect(
        screen.queryByText("Review project proposal"),
      ).not.toBeInTheDocument();
    });
  });
});
