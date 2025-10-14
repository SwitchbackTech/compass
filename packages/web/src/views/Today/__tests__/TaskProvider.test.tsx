import React from "react";
import { act, render, renderHook } from "@testing-library/react";
import { TaskProvider, useTasks } from "../context/TaskProvider";

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
      result.current.addTask("Test task", "Work");
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Test task");
    expect(result.current.tasks[0].priority).toBe("Work");
    expect(result.current.tasks[0].status).toBe("todo");
  });

  it("should update task title", () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: TaskProvider,
    });

    let taskId: string;
    act(() => {
      const task = result.current.addTask("Old title", "Work");
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
      const task = result.current.addTask("Test task", "Work");
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
      const t1 = result.current.addTask("Task 1", "Work");
      const t2 = result.current.addTask("Task 2", "Work");
      const t3 = result.current.addTask("Task 3", "Work");
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
      const task = result.current.addTask("Test task", "Work");
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
      result.current.addTask("Persisted task", "Self");
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
    expect(parsed[0].priority).toBe("Self");
  });

  it("should load tasks from localStorage on mount", () => {
    // Pre-populate localStorage
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const storageKey = `compass.today.tasks.${dateKey}`;
    const mockTasks = [
      {
        id: "task-1",
        title: "Loaded task",
        priority: "Relationships" as const,
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
    expect(result.current.tasks[0].priority).toBe("Relationships");
  });
});
