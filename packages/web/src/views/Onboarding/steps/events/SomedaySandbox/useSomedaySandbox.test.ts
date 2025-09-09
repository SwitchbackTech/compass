import { act, renderHook } from "@testing-library/react";
import { useSomedaySandbox } from "./useSomedaySandbox";

// Mock the createAndSubmitEvents function
jest.mock("./sandbox.util", () => ({
  createAndSubmitEvents: jest.fn().mockResolvedValue(undefined),
}));

// Mock the colorByPriority
jest.mock("@web/common/styles/theme.util", () => ({
  colorByPriority: {
    work: "#ff6b6b",
    self: "#4ecdc4",
    relationships: "#45b7d1",
  },
}));

describe("useSomedaySandbox", () => {
  const mockOnNext = jest.fn();
  const mockOnNavigationControlChange = jest.fn();

  const defaultProps = {
    onNext: mockOnNext,
    onNavigationControlChange: mockOnNavigationControlChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    expect(result.current.isWeekTaskReady).toBe(false);
    expect(result.current.isMonthTaskReady).toBe(false);
    expect(result.current.isHeaderAnimating).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.weekTasks).toHaveLength(2);
    expect(result.current.monthTasks).toHaveLength(3);
    expect(result.current.newWeekTask).toBe("");
    expect(result.current.newMonthTask).toBe("");
    expect(result.current.monthInputRef.current).toBeNull();
  });

  it("should set header animation to false after 2.5 seconds", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    expect(result.current.isHeaderAnimating).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(result.current.isHeaderAnimating).toBe(false);
  });

  it("should call onNavigationControlChange with correct values", () => {
    renderHook(() => useSomedaySandbox(defaultProps));

    // Initially should prevent navigation (checkboxes not ready)
    expect(mockOnNavigationControlChange).toHaveBeenCalledWith(true);
  });

  it("should add week task when handleAddWeekTask is called", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    act(() => {
      result.current.setNewWeekTask("Test week task");
    });

    act(() => {
      result.current.handleAddWeekTask();
    });

    expect(result.current.weekTasks).toHaveLength(3);
    expect(result.current.weekTasks[2].text).toBe("Test week task");
    expect(result.current.newWeekTask).toBe("");
  });

  it("should add month task when handleAddMonthTask is called", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    act(() => {
      result.current.setNewMonthTask("Test month task");
    });

    act(() => {
      result.current.handleAddMonthTask();
    });

    expect(result.current.monthTasks).toHaveLength(4);
    expect(result.current.monthTasks[3].text).toBe("Test month task");
    expect(result.current.newMonthTask).toBe("");
  });

  it("should not add empty week task", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    const initialLength = result.current.weekTasks.length;

    act(() => {
      result.current.setNewWeekTask("   "); // Only whitespace
    });

    act(() => {
      result.current.handleAddWeekTask();
    });

    expect(result.current.weekTasks).toHaveLength(initialLength);
    expect(result.current.newWeekTask).toBe("   ");
  });

  it("should not add empty month task", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    const initialLength = result.current.monthTasks.length;

    act(() => {
      result.current.setNewMonthTask("   "); // Only whitespace
    });

    act(() => {
      result.current.handleAddMonthTask();
    });

    expect(result.current.monthTasks).toHaveLength(initialLength);
    expect(result.current.newMonthTask).toBe("   ");
  });

  it("should set isWeekTaskReady to true when week tasks reach limit", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    expect(result.current.isWeekTaskReady).toBe(false);

    // Add one more week task to reach the limit (3)
    act(() => {
      result.current.setNewWeekTask("Third task");
    });

    act(() => {
      result.current.handleAddWeekTask();
    });

    expect(result.current.isWeekTaskReady).toBe(true);
  });

  it("should set isMonthTaskReady to true when month tasks reach limit", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    expect(result.current.isMonthTaskReady).toBe(false);

    // Add one more month task to reach the limit (4)
    act(() => {
      result.current.setNewMonthTask("Fourth task");
    });

    act(() => {
      result.current.handleAddMonthTask();
    });

    expect(result.current.isMonthTaskReady).toBe(true);
  });

  it("should handle keyboard events for week task input", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    act(() => {
      result.current.setNewWeekTask("Keyboard task");
    });

    const mockEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as any;

    act(() => {
      result.current.handleNewWeekTaskKeyPress(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.weekTasks).toHaveLength(3);
    expect(result.current.weekTasks[2].text).toBe("Keyboard task");
  });

  it("should handle keyboard events for month task input", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    act(() => {
      result.current.setNewMonthTask("Keyboard month task");
    });

    const mockEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as any;

    act(() => {
      result.current.handleNewMonthTaskKeyPress(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(result.current.monthTasks).toHaveLength(4);
    expect(result.current.monthTasks[3].text).toBe("Keyboard month task");
  });

  it("should not handle non-Enter key events", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    act(() => {
      result.current.setNewWeekTask("Test task");
    });

    const mockEvent = {
      key: "Space",
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as any;

    act(() => {
      result.current.handleNewWeekTaskKeyPress(mockEvent);
    });

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    expect(result.current.weekTasks).toHaveLength(2); // No new task added
  });

  it("should call createAndSubmitEvents and onNext when handleNext is called", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    // Make tasks ready
    act(() => {
      result.current.setNewWeekTask("Week task");
      result.current.handleAddWeekTask();
    });

    act(() => {
      result.current.setNewMonthTask("Month task");
      result.current.handleAddMonthTask();
    });

    await act(async () => {
      await result.current.handleNext();
    });

    expect(createAndSubmitEvents).toHaveBeenCalledWith(
      result.current.weekTasks,
      result.current.monthTasks,
    );
    expect(mockOnNext).toHaveBeenCalled();
  });

  it("should set isSubmitting to true during handleNext", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    // Mock a slow async operation
    createAndSubmitEvents.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50)),
    );

    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    // Make tasks ready
    act(() => {
      result.current.setNewWeekTask("Week task");
      result.current.handleAddWeekTask();
    });

    act(() => {
      result.current.setNewMonthTask("Month task");
      result.current.handleAddMonthTask();
    });

    // Start handleNext
    act(() => {
      result.current.handleNext();
    });

    expect(result.current.isSubmitting).toBe(true);

    // Wait for completion
    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it("should prevent multiple submissions", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    // Mock a slow async operation
    createAndSubmitEvents.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 50)),
    );

    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    // Make tasks ready
    act(() => {
      result.current.setNewWeekTask("Week task");
      result.current.handleAddWeekTask();
    });

    act(() => {
      result.current.setNewMonthTask("Month task");
      result.current.handleAddMonthTask();
    });

    // Call handleNext multiple times
    act(() => {
      result.current.handleNext();
    });

    act(() => {
      result.current.handleNext();
    });

    act(() => {
      result.current.handleNext();
    });

    // Wait for async operations to complete
    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    // Should only be called once
    expect(createAndSubmitEvents).toHaveBeenCalledTimes(1);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it("should handle createAndSubmitEvents errors gracefully", async () => {
    const { createAndSubmitEvents } = require("./sandbox.util");
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    createAndSubmitEvents.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    // Make tasks ready
    act(() => {
      result.current.setNewWeekTask("Week task");
      result.current.handleAddWeekTask();
    });

    act(() => {
      result.current.setNewMonthTask("Month task");
      result.current.handleAddMonthTask();
    });

    await act(async () => {
      await result.current.handleNext();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to create someday events:",
      expect.any(Error),
    );
    expect(mockOnNext).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);

    consoleSpy.mockRestore();
  });

  it("should call onNavigationControlChange when state changes", async () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    // Clear initial call
    mockOnNavigationControlChange.mockClear();

    // Test with unsaved changes
    act(() => {
      result.current.setNewWeekTask("Unsaved task");
    });

    expect(mockOnNavigationControlChange).toHaveBeenCalledWith(true);

    // Test with no unsaved changes but checkboxes not ready
    act(() => {
      result.current.setNewWeekTask("");
    });

    expect(mockOnNavigationControlChange).toHaveBeenCalledWith(true);

    // Test with checkboxes ready - add tasks to reach limits
    act(() => {
      result.current.setNewWeekTask("Week task");
    });

    act(() => {
      result.current.handleAddWeekTask();
    });

    act(() => {
      result.current.setNewMonthTask("Month task");
    });

    act(() => {
      result.current.handleAddMonthTask();
    });

    // Check that both checkboxes are ready
    expect(result.current.isWeekTaskReady).toBe(true);
    expect(result.current.isMonthTaskReady).toBe(true);

    // Clear the input to remove unsaved changes
    act(() => {
      result.current.setNewWeekTask("");
    });

    act(() => {
      result.current.setNewMonthTask("");
    });

    // The effect should run and call with false since both checkboxes are ready and no unsaved changes
    expect(mockOnNavigationControlChange).toHaveBeenLastCalledWith(false);
  });

  it("should assign random colors to new tasks", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    // Add one more week task (we already have 2, so this will be the 3rd)
    act(() => {
      result.current.setNewWeekTask("Task 1");
    });

    act(() => {
      result.current.handleAddWeekTask();
    });

    // Check that we have the expected number of tasks (2 default + 1 new = 3)
    expect(result.current.weekTasks).toHaveLength(3);

    const task1Color = result.current.weekTasks[2].color;

    // Colors should be from the predefined set
    const validColors = ["#ff6b6b", "#4ecdc4", "#45b7d1"];
    expect(validColors).toContain(task1Color);
  });

  it("should trim whitespace from task text", () => {
    const { result } = renderHook(() => useSomedaySandbox(defaultProps));

    act(() => {
      result.current.setNewWeekTask("  Trimmed task  ");
    });

    act(() => {
      result.current.handleAddWeekTask();
    });

    expect(result.current.weekTasks[2].text).toBe("Trimmed task");
  });

  it("should not call onNavigationControlChange when it's not provided", () => {
    const { result } = renderHook(() =>
      useSomedaySandbox({ onNext: mockOnNext }),
    );

    act(() => {
      result.current.setNewWeekTask("Test task");
    });

    // Should not throw error
    expect(() => {
      act(() => {
        result.current.handleAddWeekTask();
      });
    }).not.toThrow();
  });
});
