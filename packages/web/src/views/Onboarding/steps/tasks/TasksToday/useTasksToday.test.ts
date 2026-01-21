import { act } from "react";
import { renderHook } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { Task } from "@web/common/types/task.types";
import {
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";
import { useTasksToday } from "./useTasksToday";

// Mock the storage utilities while keeping real helpers like getDateKey
jest.mock("@web/common/utils/storage/storage.util", () => {
  const actual = jest.requireActual("@web/common/utils/storage/storage.util");
  return {
    ...actual,
    loadTasksFromStorage: jest.fn(),
    saveTasksToStorage: jest.fn(),
  };
});

describe("useTasksToday", () => {
  const mockOnNext = jest.fn();
  const mockOnNavigationControlChange = jest.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onNavigationControlChange: mockOnNavigationControlChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default state when no tasks exist", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    expect(result.current.isTaskCreated).toBe(false);
    expect(result.current.tasks).toHaveLength(0);
    expect(result.current.newTask).toBe("");
    expect(saveTasksToStorage).not.toHaveBeenCalled();
  });

  it("should load existing tasks from storage", () => {
    const existingTasks: Task[] = [
      {
        id: "task-1",
        title: "Existing task 1",
        status: "todo",
        createdAt: new Date().toISOString(),
        order: 0,
      },
      {
        id: "task-2",
        title: "Existing task 2",
        status: "todo",
        createdAt: new Date().toISOString(),
        order: 0,
      },
      {
        id: "task-3",
        title: "Existing task 3",
        status: "todo",
        createdAt: new Date().toISOString(),
        order: 0,
      },
    ];
    (loadTasksFromStorage as jest.Mock).mockReturnValue(existingTasks);

    const { result } = renderHook(() => useTasksToday(defaultProps));

    expect(result.current.tasks).toEqual(existingTasks);
    expect(result.current.isTaskCreated).toBe(true); // More than 2 tasks
  });

  it("should call onNavigationControlChange with true initially", () => {
    renderHook(() => useTasksToday(defaultProps));

    // Initially should prevent navigation (task not created)
    expect(mockOnNavigationControlChange).toHaveBeenCalledWith(true);
  });

  it("should add a task when handleAddTask is called", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    act(() => {
      result.current.setNewTask("Test task");
    });

    act(() => {
      result.current.handleAddTask();
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Test task");
    expect(result.current.tasks[0].status).toBe("todo");
    expect(result.current.newTask).toBe("");
    expect(result.current.isTaskCreated).toBe(true);
    expect(saveTasksToStorage).toHaveBeenCalled();
  });

  it("should not add empty task", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    const initialLength = result.current.tasks.length;

    act(() => {
      result.current.setNewTask("   "); // Only whitespace
    });

    act(() => {
      result.current.handleAddTask();
    });

    expect(result.current.tasks).toHaveLength(initialLength);
    expect(result.current.newTask).toBe("   ");
  });

  it("should not add task when max limit is reached", () => {
    const existingTasks: Task[] = Array.from({ length: 20 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      status: "todo" as const,
      createdAt: new Date().toISOString(),
      order: 0,
    }));
    (loadTasksFromStorage as jest.Mock).mockReturnValue(existingTasks);

    const { result } = renderHook(() => useTasksToday(defaultProps));

    act(() => {
      result.current.setNewTask("New task");
    });

    act(() => {
      result.current.handleAddTask();
    });

    expect(result.current.tasks).toHaveLength(20);
    expect(result.current.newTask).toBe("New task");
  });

  it("should handle keyboard events for task input", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    act(() => {
      result.current.setNewTask("Keyboard task");
    });

    const mockEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleTaskKeyPress(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Keyboard task");
  });

  it("should not handle non-Enter key events", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    act(() => {
      result.current.setNewTask("Test task");
    });

    const mockEvent = {
      key: "Space",
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => {
      result.current.handleTaskKeyPress(mockEvent);
    });

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    expect(result.current.tasks).toHaveLength(0); // No new task added
  });

  it("should call onNext when handleNext is called", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    act(() => {
      result.current.handleNext();
    });

    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it("should call onNavigationControlChange when state changes", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    // Clear initial call
    mockOnNavigationControlChange.mockClear();

    // Test with unsaved changes
    act(() => {
      result.current.setNewTask("Unsaved task");
    });

    expect(mockOnNavigationControlChange).toHaveBeenCalledWith(true);

    // Test with no unsaved changes but task not created
    act(() => {
      result.current.setNewTask("");
    });

    expect(mockOnNavigationControlChange).toHaveBeenCalledWith(true);

    // Create a task
    act(() => {
      result.current.setNewTask("New task");
    });

    act(() => {
      result.current.handleAddTask();
    });

    // Should allow navigation now
    expect(mockOnNavigationControlChange).toHaveBeenLastCalledWith(false);
  });

  it("should trim whitespace from task text", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    act(() => {
      result.current.setNewTask("  Trimmed task  ");
    });

    act(() => {
      result.current.handleAddTask();
    });

    expect(result.current.tasks[0].title).toBe("Trimmed task");
  });

  it("should not call onNavigationControlChange when it's not provided", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday({ onNext: mockOnNext }));

    act(() => {
      result.current.setNewTask("Test task");
    });

    // Should not throw error
    expect(() => {
      act(() => {
        result.current.handleAddTask();
      });
    }).not.toThrow();
  });

  it("should mark task as created when user adds a task", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    expect(result.current.isTaskCreated).toBe(false);

    act(() => {
      result.current.setNewTask("New task");
    });

    act(() => {
      result.current.handleAddTask();
    });

    expect(result.current.isTaskCreated).toBe(true);
  });

  it("should use today's date key for storage", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const today = dayjs();

    const expectedDateKey = today.format(
      dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT,
    );

    renderHook(() => useTasksToday(defaultProps));

    expect(loadTasksFromStorage).toHaveBeenCalledWith(expectedDateKey);
    expect(saveTasksToStorage).not.toHaveBeenCalled();
  });

  it("should generate unique task IDs", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    act(() => {
      result.current.setNewTask("Task 1");
    });

    act(() => {
      result.current.handleAddTask();
    });

    act(() => {
      result.current.setNewTask("Task 2");
    });

    act(() => {
      result.current.handleAddTask();
    });

    const taskIds = result.current.tasks.map((task) => task.id);
    const uniqueIds = new Set(taskIds);
    expect(uniqueIds.size).toBe(taskIds.length);
  });

  it("should set createdAt timestamp for new tasks", () => {
    (loadTasksFromStorage as jest.Mock).mockReturnValue([]);
    const { result } = renderHook(() => useTasksToday(defaultProps));

    const beforeCreation = new Date().toISOString();

    act(() => {
      result.current.setNewTask("New task");
    });

    act(() => {
      result.current.handleAddTask();
    });

    const afterCreation = new Date().toISOString();
    const newTask = result.current.tasks[0];

    expect(newTask.createdAt).toBeDefined();
    expect(newTask.createdAt >= beforeCreation).toBe(true);
    expect(newTask.createdAt <= afterCreation).toBe(true);
  });
});
