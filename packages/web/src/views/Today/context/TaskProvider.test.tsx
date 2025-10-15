import React from "react";
import { act, renderHook } from "@testing-library/react";
import { Task } from "../task.types";
import { TaskProvider, useTasks } from "./TaskProvider";

describe("TaskProvider", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it("should provide task context to children", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    expect(result.current.tasks).toEqual([]);
  });

  it("should add a task", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    act(() => {
      result.current.addTask("Test task");
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Test task");
    expect(result.current.tasks[0].status).toBe("todo");
  });

  it("should update task title", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    let taskId: string;
    act(() => {
      const task = result.current.addTask("Old title");
      taskId = task.id;
    });

    act(() => {
      result.current.updateTaskTitle(taskId, "New title");
    });

    expect(result.current.tasks[0].title).toBe("New title");
  });

  it("should toggle task status", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    let taskId: string;
    act(() => {
      const task = result.current.addTask("Test task");
      taskId = task.id;
    });

    expect(result.current.tasks[0].status).toBe("todo");

    act(() => {
      result.current.toggleTaskStatus(taskId);
    });

    expect(result.current.tasks[0].status).toBe("completed");

    act(() => {
      result.current.toggleTaskStatus(taskId);
    });

    expect(result.current.tasks[0].status).toBe("todo");
  });

  it("should move completed tasks to the end", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    let task1Id: string, task2Id: string, task3Id: string;

    act(() => {
      const t1 = result.current.addTask("Task 1");
      const t2 = result.current.addTask("Task 2");
      const t3 = result.current.addTask("Task 3");
      task1Id = t1.id;
      task2Id = t2.id;
      task3Id = t3.id;
    });

    // Complete the second task
    act(() => {
      result.current.toggleTaskStatus(task2Id);
    });

    expect(result.current.tasks[0].id).toBe(task1Id);
    expect(result.current.tasks[1].id).toBe(task3Id);
    expect(result.current.tasks[2].id).toBe(task2Id);
    expect(result.current.tasks[2].status).toBe("completed");
  });

  it("should delete a task", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    let taskId: string;
    act(() => {
      const task = result.current.addTask("Test task");
      taskId = task.id;
    });

    expect(result.current.tasks).toHaveLength(1);

    act(() => {
      result.current.deleteTask(taskId);
    });

    expect(result.current.tasks).toHaveLength(0);
  });

  it("should persist tasks to localStorage", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    act(() => {
      result.current.addTask("Persisted task");
    });

    // Check localStorage
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const storageKey = `compass.today.tasks.${dateKey}`;
    const stored = localStorage.getItem(storageKey);

    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Persisted task");
  });

  it("should load tasks from localStorage on mount", () => {
    // Pre-populate localStorage
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const storageKey = `compass.today.tasks.${dateKey}`;
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Loaded task",
        status: "todo" as const,
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(storageKey, JSON.stringify(mockTasks));

    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Loaded task");
  });

  it("should sort tasks on load when there are mixed statuses", () => {
    // Pre-populate localStorage with mixed statuses
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const storageKey = `compass.today.tasks.${dateKey}`;
    const mockTasks: Task[] = [
      {
        id: "task-1",
        title: "Todo 1",
        status: "todo" as const,
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "task-2",
        title: "Completed 1",
        status: "completed" as const,
        createdAt: "2024-01-01T11:00:00Z",
      },
      {
        id: "task-3",
        title: "Todo 2",
        status: "todo" as const,
        createdAt: "2024-01-01T12:00:00Z",
      },
    ];
    localStorage.setItem(storageKey, JSON.stringify(mockTasks));

    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    // Tasks should be sorted with todos first, completed last
    expect(result.current.tasks[0].id).toBe("task-1");
    expect(result.current.tasks[1].id).toBe("task-3");
    expect(result.current.tasks[2].id).toBe("task-2");
  });

  it("should move uncompleted task back to top section", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    let task2Id: string;

    act(() => {
      result.current.addTask("Task 1");
      const t2 = result.current.addTask("Task 2");
      result.current.addTask("Task 3");
      task2Id = t2.id;
    });

    // Complete the second task
    act(() => {
      result.current.toggleTaskStatus(task2Id);
    });

    // Task 2 should be at the end
    expect(result.current.tasks[0].title).toBe("Task 1");
    expect(result.current.tasks[1].title).toBe("Task 3");
    expect(result.current.tasks[2].title).toBe("Task 2");

    // Uncomplete the second task
    act(() => {
      result.current.toggleTaskStatus(task2Id);
    });

    // Task 2 should be back in the incomplete section (at the end of incomplete tasks)
    expect(result.current.tasks[0].title).toBe("Task 1");
    expect(result.current.tasks[1].title).toBe("Task 3");
    expect(result.current.tasks[2].title).toBe("Task 2");
  });
});
