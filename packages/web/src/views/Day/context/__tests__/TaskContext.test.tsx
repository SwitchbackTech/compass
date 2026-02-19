import { ObjectId } from "bson";
import { PropsWithChildren, act } from "react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import dayjs from "@core/util/date/dayjs";
import { renderHook, waitFor } from "@web/__tests__/__mocks__/mock.render";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { clearCompassLocalDb } from "@web/__tests__/utils/storage/indexeddb.test.util";
import { Task } from "@web/common/types/task.types";
import {
  loadTasksFromIndexedDB,
  saveTasksToIndexedDB,
} from "@web/common/utils/storage/task.storage.util";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";
import { TaskProviderWrapper } from "@web/views/Day/util/day.test-util";

describe("TaskProvider", () => {
  function Wrapper(props: PropsWithChildren) {
    return (
      <RouterProvider
        future={{ v7_startTransition: true }}
        router={createMemoryRouter(
          [{ index: true, element: <TaskProviderWrapper {...props} /> }],
          { initialEntries: ["/"], future: { v7_relativeSplatPath: true } },
        )}
      />
    );
  }

  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();
    await clearCompassLocalDb();
  });

  async function waitForTasksReady(result: {
    current: { isLoadingTasks: boolean };
  }) {
    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
    });
  }

  it("should provide task context to children", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    expect(result.current.tasks).toEqual([]);
  });

  it("should add a task", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    act(() => {
      result.current.addTask("Test task");
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Test task");
    expect(result.current.tasks[0].status).toBe("todo");
    expect(ObjectId.isValid(result.current.tasks[0]._id)).toBe(true);
  });

  it("should update task title", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    let taskId: string;
    act(() => {
      const task = result.current.addTask("Old title");
      taskId = task._id;
    });

    act(() => {
      result.current.updateTaskTitle(taskId, "New title");
    });

    expect(result.current.tasks[0].title).toBe("New title");
  });

  it("should toggle task status", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    let taskId: string;
    act(() => {
      const task = result.current.addTask("Test task");
      taskId = task._id;
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

  it("should move completed tasks to the end", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    let task1Id: string = "",
      task2Id: string = "",
      task3Id: string = "";

    act(() => {
      const t1 = result.current.addTask("Task 1");
      const t2 = result.current.addTask("Task 2");
      const t3 = result.current.addTask("Task 3");
      task1Id = t1._id;
      task2Id = t2._id;
      task3Id = t3._id;
    });

    // Complete the second task
    act(() => {
      result.current.toggleTaskStatus(task2Id);
    });

    expect(result.current.tasks[0]._id).toBe(task1Id);
    expect(result.current.tasks[1]._id).toBe(task3Id);
    expect(result.current.tasks[2]._id).toBe(task2Id);
    expect(result.current.tasks[2].status).toBe("completed");
  });

  it("should delete a task", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    let taskId: string;
    act(() => {
      const task = result.current.addTask("Test task");
      taskId = task._id;
    });

    expect(result.current.tasks).toHaveLength(1);

    act(() => {
      result.current.deleteTask(taskId);
    });

    expect(result.current.tasks).toHaveLength(0);
  });

  it("should persist tasks to IndexedDB", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    let createdTaskId = "";
    act(() => {
      const createdTask = result.current.addTask("Persisted task");
      createdTaskId = createdTask._id;
    });

    const today = dayjs();
    const dateKey = today.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

    await waitFor(async () => {
      const stored = await loadTasksFromIndexedDB(dateKey);
      expect(stored).toHaveLength(1);
    });

    const stored = await loadTasksFromIndexedDB(dateKey);
    expect(stored[0].title).toBe("Persisted task");
    expect(stored[0]._id).toBe(createdTaskId);
  });

  it("should load tasks from IndexedDB on mount", async () => {
    const today = dayjs();
    const dateKey = today.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
    const mockTasks: Task[] = [
      createMockTask({ _id: "task-1", title: "Loaded task" }),
    ];

    await saveTasksToIndexedDB(dateKey, mockTasks);

    const { result } = renderHook(useTasks, { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1);
    });
    expect(result.current.tasks[0].title).toBe("Loaded task");
  });

  it("should not overwrite IndexedDB with empty array on mount", async () => {
    // Regression test for bug where tasks were lost on refresh.
    const today = dayjs();
    const dateKey = today.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
    const mockTasks: Task[] = [
      createMockTask({ _id: "task-1", title: "Existing task" }),
    ];
    await saveTasksToIndexedDB(dateKey, mockTasks);

    const { result } = renderHook(useTasks, { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1);
    });

    const stored = await loadTasksFromIndexedDB(dateKey);
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Existing task");
  });

  it("should sort tasks on load when there are mixed statuses", async () => {
    const today = dayjs();
    const dateKey = today.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
    const mockTasks: Task[] = [
      createMockTask({ _id: "task-1", status: "todo" }),
      createMockTask({ _id: "task-2", status: "completed" }),
      createMockTask({ _id: "task-3", status: "todo" }),
    ];

    await saveTasksToIndexedDB(dateKey, mockTasks);

    const { result } = renderHook(useTasks, { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(3);
    });

    // Tasks should be sorted with todos first, completed last
    expect(result.current.tasks[0]._id).toBe("task-1");
    expect(result.current.tasks[1]._id).toBe("task-3");
    expect(result.current.tasks[2]._id).toBe("task-2");
  });

  it("should move uncompleted task back to top section", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    let task2Id: string;

    act(() => {
      result.current.addTask("Task 1");
      const t2 = result.current.addTask("Task 2");
      result.current.addTask("Task 3");
      task2Id = t2._id;
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

  it("should restore a deleted task", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    let taskId: string;
    act(() => {
      const task = result.current.addTask("Test task");
      taskId = task._id;
    });

    expect(result.current.tasks).toHaveLength(1);

    // Delete the task
    act(() => {
      result.current.deleteTask(taskId);
    });

    expect(result.current.tasks).toHaveLength(0);
    expect(result.current.undoState).toBeTruthy();
    expect(result.current.undoState?.type).toBe("delete");
    expect(result.current.undoState?.task.title).toBe("Test task");

    // Restore the task
    act(() => {
      result.current.restoreTask();
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Test task");
    expect(result.current.undoState).toBeNull();
  });

  it("should not restore when no task is deleted", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    expect(result.current.tasks).toHaveLength(0);
    expect(result.current.undoState).toBeNull();

    // Try to restore when no task is deleted
    act(() => {
      result.current.restoreTask();
    });

    expect(result.current.tasks).toHaveLength(0);
    expect(result.current.undoState).toBeNull();
  });

  it("should only track the most recent deleted task when multiple tasks are deleted quickly", async () => {
    const { result } = renderHook(useTasks, { wrapper: Wrapper });
    await waitForTasksReady(result);

    let firstTaskId = "";
    let secondTaskId = "";

    // Add two tasks
    act(() => {
      const firstTask = result.current.addTask("First task");
      const secondTask = result.current.addTask("Second task");
      firstTaskId = firstTask._id;
      secondTaskId = secondTask._id;
    });

    expect(result.current.tasks).toHaveLength(2);

    // Delete first task
    act(() => {
      result.current.deleteTask(firstTaskId);
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.undoState?.type).toBe("delete");
    expect(result.current.undoState?.task.title).toBe("First task");

    // Delete second task quickly (should replace the first deleted task)
    act(() => {
      result.current.deleteTask(secondTaskId);
    });

    expect(result.current.tasks).toHaveLength(0);
    expect(result.current.undoState?.type).toBe("delete");
    expect(result.current.undoState?.task.title).toBe("Second task");

    // Restore should only restore the most recent task (second task)
    act(() => {
      result.current.restoreTask();
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("Second task");
    expect(result.current.tasks[0]._id).toBe(secondTaskId);
    expect(result.current.undoState).toBeNull();
  });

  describe("reorderTasks", () => {
    it("should reorder tasks and update order within status groups", async () => {
      const { result } = renderHook(useTasks, { wrapper: Wrapper });
      await waitForTasksReady(result);

      act(() => {
        result.current.addTask("Task 1");
        result.current.addTask("Task 2");
        result.current.addTask("Task 3");
      });

      // Mark one task as completed
      act(() => {
        result.current.onStatusToggle(result.current.tasks[2]._id);
      });

      expect(result.current.tasks).toHaveLength(3);
      expect(result.current.tasks[0].status).toBe("todo");
      expect(result.current.tasks[1].status).toBe("todo");
      expect(result.current.tasks[2].status).toBe("completed");

      const originalIds = result.current.tasks.map((t) => t._id);

      // Reorder: move first todo task to second position
      act(() => {
        result.current.reorderTasks(0, 1);
      });

      // After reordering, the array should have Task2, Task1, Task3
      expect(result.current.tasks[0]._id).toBe(originalIds[1]); // Task2 now first
      expect(result.current.tasks[1]._id).toBe(originalIds[0]); // Task1 now second
      expect(result.current.tasks[2]._id).toBe(originalIds[2]); // Task3 still last

      // Check order values within status groups
      const todoTasks = result.current.tasks.filter((t) => t.status === "todo");
      const completedTasks = result.current.tasks.filter(
        (t) => t.status === "completed",
      );

      expect(todoTasks[0].order).toBe(0); // First todo task
      expect(todoTasks[1].order).toBe(1); // Second todo task
      expect(completedTasks[0].order).toBe(0); // Completed task
    });

    it("should handle reordering within the same status group", async () => {
      const { result } = renderHook(useTasks, { wrapper: Wrapper });
      await waitForTasksReady(result);

      act(() => {
        result.current.addTask("Task 1");
        result.current.addTask("Task 2");
        result.current.addTask("Task 3");
      });

      const originalIds = result.current.tasks.map((t) => t._id);

      act(() => {
        result.current.reorderTasks(0, 2);
      });

      // After reordering 0->2: Task2, Task3, Task1
      expect(result.current.tasks[0]._id).toBe(originalIds[1]); // Task 2 now first
      expect(result.current.tasks[1]._id).toBe(originalIds[2]); // Task 3 now second
      expect(result.current.tasks[2]._id).toBe(originalIds[0]); // Task 1 now third

      // Check order is updated
      expect(result.current.tasks[0].order).toBe(0);
      expect(result.current.tasks[1].order).toBe(1);
      expect(result.current.tasks[2].order).toBe(2);
    });

    it("should handle reordering across status boundaries", async () => {
      const { result } = renderHook(useTasks, { wrapper: Wrapper });
      await waitForTasksReady(result);

      act(() => {
        result.current.addTask("Todo Task");
        result.current.addTask("Completed Task");
      });

      // Mark second task as completed
      act(() => {
        result.current.onStatusToggle(result.current.tasks[1]._id);
      });

      expect(result.current.tasks[0].status).toBe("todo");
      expect(result.current.tasks[1].status).toBe("completed");

      const originalIds = result.current.tasks.map((t) => t._id);

      // Move todo task to completed position (index 1)
      act(() => {
        result.current.reorderTasks(0, 1);
      });

      // After reordering: [Completed Task, Todo Task]
      expect(result.current.tasks[0]._id).toBe(originalIds[1]); // Completed task now first
      expect(result.current.tasks[1]._id).toBe(originalIds[0]); // Todo task now second

      // Status should remain the same (reorderTasks doesn't change status)
      expect(result.current.tasks[0].status).toBe("completed");
      expect(result.current.tasks[1].status).toBe("todo");

      // Check order is updated correctly within status groups
      const todoTasks = result.current.tasks.filter((t) => t.status === "todo");
      const completedTasks = result.current.tasks.filter(
        (t) => t.status === "completed",
      );

      expect(todoTasks[0].order).toBe(0); // Todo task gets order 0
      expect(completedTasks[0].order).toBe(0); // Completed task gets order 0
    });
  });
});
