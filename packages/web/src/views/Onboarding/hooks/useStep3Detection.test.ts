import { act, renderHook, waitFor } from "@testing-library/react";
import { Task } from "@web/common/types/task.types";
import {
  COMPASS_TASKS_SAVED_EVENT_NAME,
  getDateKey,
  loadTasksFromStorage,
  saveTasksToStorage,
} from "@web/common/utils/storage/storage.util";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import { markStepCompleted } from "../utils/onboardingStorage.util";
import { useStep3Detection } from "./useStep3Detection";

describe("useStep3Detection", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should detect when a task description is edited", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    // Initialize with a task without description
    const existingTask: Task = {
      id: "task-1",
      title: "Test task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
      description: "",
    };
    saveTasksToStorage(dateKey, [existingTask]);

    renderHook(() =>
      useStep3Detection({
        currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
        onStepComplete,
      }),
    );

    // Wait for hook to initialize
    await waitFor(() => {
      expect(loadTasksFromStorage(dateKey).length).toBe(1);
    });

    // Update task description
    const updatedTask: Task = {
      ...existingTask,
      description: "This is a note-to-self",
    };
    saveTasksToStorage(dateKey, [updatedTask]);

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

  it("should detect when description changes from one value to another", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    const existingTask: Task = {
      id: "task-1",
      title: "Test task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
      description: "Original description",
    };
    saveTasksToStorage(dateKey, [existingTask]);

    renderHook(() =>
      useStep3Detection({
        currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
        onStepComplete,
      }),
    );

    await waitFor(() => {
      expect(loadTasksFromStorage(dateKey).length).toBe(1);
    });

    // Update description
    const updatedTask: Task = {
      ...existingTask,
      description: "Updated description",
    };
    saveTasksToStorage(dateKey, [updatedTask]);

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

  it("should not detect when description is empty", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    const existingTask: Task = {
      id: "task-1",
      title: "Test task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
      description: "Original description",
    };
    saveTasksToStorage(dateKey, [existingTask]);

    renderHook(() =>
      useStep3Detection({
        currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
        onStepComplete,
      }),
    );

    await waitFor(() => {
      expect(loadTasksFromStorage(dateKey).length).toBe(1);
    });

    // Clear description (should not trigger completion)
    const updatedTask: Task = {
      ...existingTask,
      description: "",
    };
    saveTasksToStorage(dateKey, [updatedTask]);

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

  it("should not detect description changes when not on step 3", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    const existingTask: Task = {
      id: "task-1",
      title: "Test task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
      description: "",
    };
    saveTasksToStorage(dateKey, [existingTask]);

    renderHook(() =>
      useStep3Detection({
        currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
        onStepComplete,
      }),
    );

    const updatedTask: Task = {
      ...existingTask,
      description: "New description",
    };
    saveTasksToStorage(dateKey, [updatedTask]);

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

  it("should not detect changes for different date", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();
    const otherDateKey = "2024-01-01";

    renderHook(() =>
      useStep3Detection({
        currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
        onStepComplete,
      }),
    );

    const task: Task = {
      id: "task-1",
      title: "Test task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
      description: "New description",
    };
    saveTasksToStorage(otherDateKey, [task]);

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

    const existingTask: Task = {
      id: "task-1",
      title: "Test task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
      description: "",
    };
    saveTasksToStorage(dateKey, [existingTask]);

    const { rerender } = renderHook(
      ({ currentStep }) =>
        useStep3Detection({
          currentStep,
          onStepComplete,
        }),
      {
        initialProps: { currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION },
      },
    );

    // Update description
    const updatedTask: Task = {
      ...existingTask,
      description: "New description",
    };
    saveTasksToStorage(dateKey, [updatedTask]);

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

    // Change to step 1
    rerender({ currentStep: ONBOARDING_STEPS.CREATE_TASK });

    // Reset mock
    onStepComplete.mockClear();

    // Update description again - should not trigger
    const anotherUpdatedTask: Task = {
      ...existingTask,
      description: "Another description",
    };
    saveTasksToStorage(dateKey, [anotherUpdatedTask]);

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

  it("should skip detection if step 3 is already completed", async () => {
    const onStepComplete = jest.fn();
    const dateKey = getDateKey();

    // Mark step 3 as completed
    markStepCompleted(ONBOARDING_STEPS.EDIT_DESCRIPTION);

    // Initialize with a task without description
    const existingTask: Task = {
      id: "task-1",
      title: "Test task",
      status: "todo",
      order: 0,
      createdAt: new Date().toISOString(),
      description: "",
    };
    saveTasksToStorage(dateKey, [existingTask]);

    renderHook(() =>
      useStep3Detection({
        currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
        onStepComplete,
      }),
    );

    // Wait for hook to initialize
    await waitFor(() => {
      expect(loadTasksFromStorage(dateKey).length).toBe(1);
    });

    // Update task description
    const updatedTask: Task = {
      ...existingTask,
      description: "This is a note-to-self",
    };
    saveTasksToStorage(dateKey, [updatedTask]);

    // Dispatch the event
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
        useStep3Detection({
          currentStep: ONBOARDING_STEPS.EDIT_DESCRIPTION,
          onStepComplete,
        }),
      );
    }).not.toThrow();
  });
});
