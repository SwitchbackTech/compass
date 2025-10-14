import React from "react";
import { act, render, renderHook } from "@testing-library/react";
import { TodayMinimalProvider, useTodayMinimal } from "./TodayMinimalProvider";

describe("TodayMinimalProvider", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it("should provide context to children", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    expect(result.current.tasks).toBeDefined();
    expect(result.current.timeBlocks).toBeDefined();
    expect(result.current.addTask).toBeDefined();
    expect(result.current.addTimeBlock).toBeDefined();
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTodayMinimal());
    }).toThrow("useTodayMinimal must be used within a TodayMinimalProvider");

    consoleSpy.mockRestore();
  });

  it("should add a task", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    act(() => {
      result.current.addTask("Test task", "Work", "Development");
    });

    expect(result.current.tasks).toHaveLength(6); // 5 initial + 1 new
    const newTask = result.current.tasks.find(
      (task) => task.title === "Test task",
    );
    expect(newTask).toBeDefined();
    expect(newTask?.priority).toBe("Work");
    expect(newTask?.category).toBe("Development");
    expect(newTask?.status).toBe("todo");
  });

  it("should update task title", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    const taskId = result.current.tasks[0].id;

    act(() => {
      result.current.updateTaskTitle(taskId, "Updated title");
    });

    expect(result.current.tasks[0].title).toBe("Updated title");
  });

  it("should toggle task status", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    const taskId = result.current.tasks[0].id;
    expect(result.current.tasks[0].status).toBe("in-progress");

    act(() => {
      result.current.toggleTaskStatus(taskId);
    });

    // The task should be moved to the end when completed
    const completedTask = result.current.tasks.find(
      (task) => task.id === taskId,
    );
    expect(completedTask?.status).toBe("completed");

    act(() => {
      result.current.toggleTaskStatus(taskId);
    });

    // The task should be moved back to the beginning when uncompleted
    const uncompletedTask = result.current.tasks.find(
      (task) => task.id === taskId,
    );
    expect(uncompletedTask?.status).toBe("todo");
  });

  it("should move completed tasks to the end", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    const taskId = result.current.tasks[1].id; // Second task

    act(() => {
      result.current.toggleTaskStatus(taskId);
    });

    // Check that completed task is at the end
    const completedTasks = result.current.tasks.filter(
      (task) => task.status === "completed",
    );
    expect(completedTasks).toHaveLength(1);
    expect(completedTasks[0].id).toBe(taskId);
    expect(result.current.tasks[result.current.tasks.length - 1].id).toBe(
      taskId,
    );
  });

  it("should delete a task", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    const initialLength = result.current.tasks.length;
    const taskId = result.current.tasks[0].id;

    act(() => {
      result.current.deleteTask(taskId);
    });

    expect(result.current.tasks).toHaveLength(initialLength - 1);
    expect(
      result.current.tasks.find((task) => task.id === taskId),
    ).toBeUndefined();
  });

  it("should add a time block", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    act(() => {
      result.current.addTimeBlock("10:00", "11:00", "Test event");
    });

    expect(result.current.timeBlocks).toHaveLength(5); // 4 initial + 1 new
    const newBlock = result.current.timeBlocks.find(
      (block) => block.title === "Test event",
    );
    expect(newBlock).toBeDefined();
    expect(newBlock?.startTime).toBe("10:00");
    expect(newBlock?.endTime).toBe("11:00");
    expect(newBlock?.priority).toBe("Work");
  });

  it("should update time block title", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    const blockId = result.current.timeBlocks[0].id;

    act(() => {
      result.current.updateTimeBlockTitle(blockId, "Updated event");
    });

    expect(result.current.timeBlocks[0].title).toBe("Updated event");
  });

  it("should update time block priority", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    const blockId = result.current.timeBlocks[0].id;

    act(() => {
      result.current.updateTimeBlockPriority(blockId, "Self");
    });

    expect(result.current.timeBlocks[0].priority).toBe("Self");
  });

  it("should delete a time block", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    const initialLength = result.current.timeBlocks.length;
    const blockId = result.current.timeBlocks[0].id;

    act(() => {
      result.current.deleteTimeBlock(blockId);
    });

    expect(result.current.timeBlocks).toHaveLength(initialLength - 1);
    expect(
      result.current.timeBlocks.find((block) => block.id === blockId),
    ).toBeUndefined();
  });

  it("should persist data to localStorage", () => {
    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    act(() => {
      result.current.addTask("Persisted task", "Self", "Health");
    });

    // Check localStorage
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const tasksKey = `compass.todayMinimal.tasks.${dateKey}`;
    const stored = localStorage.getItem(tasksKey);

    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(6); // 5 initial + 1 new
    expect(
      parsed.find((task: any) => task.title === "Persisted task"),
    ).toBeDefined();
  });

  it("should load data from localStorage on mount", () => {
    // Pre-populate localStorage
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const tasksKey = `compass.todayMinimal.tasks.${dateKey}`;
    const timeBlocksKey = `compass.todayMinimal.timeBlocks.${dateKey}`;

    const mockTasks = [
      {
        id: "loaded-task-1",
        title: "Loaded task",
        priority: "Relationships",
        status: "todo",
        estimatedTime: 30,
        actualTime: 0,
        category: "Personal",
      },
    ];

    const mockTimeBlocks = [
      {
        id: "loaded-block-1",
        title: "Loaded event",
        startTime: "14:00",
        endTime: "15:00",
        category: "Meeting",
        priority: "Work",
        type: "event",
        status: "todo",
      },
    ];

    localStorage.setItem(tasksKey, JSON.stringify(mockTasks));
    localStorage.setItem(timeBlocksKey, JSON.stringify(mockTimeBlocks));

    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Loaded task");
    expect(result.current.timeBlocks).toHaveLength(1);
    expect(result.current.timeBlocks[0].title).toBe("Loaded event");
  });

  it("should handle localStorage errors gracefully", () => {
    // Mock localStorage to throw error
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = jest.fn(() => {
      throw new Error("localStorage error");
    });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useTodayMinimal(), {
      wrapper: TodayMinimalProvider,
    });

    // Should still work with default data
    expect(result.current.tasks).toHaveLength(5);
    expect(result.current.timeBlocks).toHaveLength(4);

    // Restore mocks
    localStorage.getItem = originalGetItem;
    consoleSpy.mockRestore();
  });
});
