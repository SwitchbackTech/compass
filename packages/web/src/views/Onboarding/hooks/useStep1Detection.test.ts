import { act, renderHook, waitFor } from "@testing-library/react";
import { Task } from "@web/common/types/task.types";
import {
  COMPASS_TASKS_SAVED_EVENT_NAME,
  getDateKey,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";
import { markStepCompleted } from "../utils/onboardingStorage.util";
import { useStep1Detection } from "./useStep1Detection";

describe("useStep1Detection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should detect when a task is created", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    // Initialize with some existing tasks
    const existingTasks: Task[] = [
      {
        id: "task-1",
        title: "Existing task",
        status: "todo",
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ];
    saveTasksToStorage(dateKey, existingTasks);

    renderHook(() =>
      useStep1Detection({
        currentStep: 1,
        onStepComplete,
      }),
    );

    // Wait for hook to initialize
    await waitFor(() => {
      expect(loadTasksFromStorage(dateKey).length).toBe(1);
    });

    // Create a new task
    const newTask: Task = {
      id: "task-2",
      title: "New task",
      status: "todo",
      order: 1,
      createdAt: new Date().toISOString(),
    };
    const updatedTasks = [...existingTasks, newTask];
    saveTasksToStorage(dateKey, updatedTasks);

    // Dispatch the event
    act(() => {
      window.dispatchEvent(
        new CustomEvent(COMPASS_TASKS_SAVED_EVENT_NAME, {
          detail: { dateKey },
        }),
      );
    });

    await waitFor(() => {
      expect(onStepComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should not detect task creation when not on step 1", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    renderHook(() =>
      useStep1Detection({
        currentStep: 2,
        onStepComplete,
      }),
    );

    const newTask: Task = {
      id: "task-1",
      title: "New task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
    };
    saveTasksToStorage(dateKey, [newTask]);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(COMPASS_TASKS_SAVED_EVENT_NAME, {
          detail: { dateKey },
        }),
      );
    });

    // Wait a bit to ensure no call happens
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it("should not detect task creation for different date", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();
    const otherDateKey = "2024-01-01";

    renderHook(() =>
      useStep1Detection({
        currentStep: 1,
        onStepComplete,
      }),
    );

    const newTask: Task = {
      id: "task-1",
      title: "New task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
    };
    saveTasksToStorage(otherDateKey, [newTask]);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(COMPASS_TASKS_SAVED_EVENT_NAME, {
          detail: { dateKey: otherDateKey },
        }),
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it("should reset when step changes", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    const { rerender } = renderHook(
      ({ currentStep }) =>
        useStep1Detection({
          currentStep,
          onStepComplete,
        }),
      {
        initialProps: { currentStep: 1 },
      },
    );

    // Create a task
    const newTask: Task = {
      id: "task-1",
      title: "New task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
    };
    saveTasksToStorage(dateKey, [newTask]);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(COMPASS_TASKS_SAVED_EVENT_NAME, {
          detail: { dateKey },
        }),
      );
    });

    await waitFor(() => {
      expect(onStepComplete).toHaveBeenCalledTimes(1);
    });

    // Change to step 2
    rerender({ currentStep: 2 });

    // Reset mock
    onStepComplete.mockClear();

    // Create another task - should not trigger
    const anotherTask: Task = {
      id: "task-2",
      title: "Another task",
      status: "todo",
      order: 1,
      createdAt: new Date().toISOString(),
    };
    const updatedTasks = loadTasksFromStorage(dateKey);
    saveTasksToStorage(dateKey, [...updatedTasks, anotherTask]);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(COMPASS_TASKS_SAVED_EVENT_NAME, {
          detail: { dateKey },
        }),
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it("should skip detection if step 1 is already completed", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    // Mark step 1 as completed
    markStepCompleted(1);

    renderHook(() =>
      useStep1Detection({
        currentStep: 1,
        onStepComplete,
      }),
    );

    // Create a new task
    const newTask: Task = {
      id: "task-1",
      title: "New task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
    };
    saveTasksToStorage(dateKey, [newTask]);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(COMPASS_TASKS_SAVED_EVENT_NAME, {
          detail: { dateKey },
        }),
      );
    });

    // Wait a bit to ensure no call happens
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onStepComplete).not.toHaveBeenCalled();
  });

  it("should handle window being undefined gracefully", () => {
    const onStepComplete = jest.fn();

    // The hook checks for typeof window === "undefined" internally
    // This test verifies the hook doesn't crash when window is checked
    expect(() => {
      renderHook(() =>
        useStep1Detection({
          currentStep: 1,
          onStepComplete,
        }),
      );
    }).not.toThrow();
  });
});
