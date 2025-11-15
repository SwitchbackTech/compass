import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import { useTasks } from "@web/views/Day/hooks/tasks/useTasks";
import { TaskProviderWrapper } from "@web/views/Day/util/day.test-util";
import { useAvailableTasks } from "./useAvailableTasks";

// Component that uses both hooks to ensure they share the same provider
function TestComponent({
  onTasksResult,
  onAvailableTasksResult,
}: {
  onTasksResult: (result: ReturnType<typeof useTasks>) => void;
  onAvailableTasksResult: (
    result: ReturnType<typeof useAvailableTasks>,
  ) => void;
}) {
  const tasksResult = useTasks();
  const availableTasksResult = useAvailableTasks();

  // Use refs to track if callbacks have been set
  const tasksResultRef = React.useRef(tasksResult);
  const availableTasksResultRef = React.useRef(availableTasksResult);

  // Update refs whenever values change
  React.useEffect(() => {
    tasksResultRef.current = tasksResult;
    onTasksResult(tasksResult);
  }, [tasksResult, onTasksResult]);

  React.useEffect(() => {
    availableTasksResultRef.current = availableTasksResult;
    onAvailableTasksResult(availableTasksResult);
  }, [availableTasksResult, onAvailableTasksResult]);

  return null;
}

describe("useAvailableTasks", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads tasks from today only", async () => {
    let tasksResult: ReturnType<typeof useTasks> | null = null;
    let availableTasksResult: ReturnType<typeof useAvailableTasks> | null =
      null;

    render(
      <TaskProviderWrapper>
        <TestComponent
          onTasksResult={(result) => {
            tasksResult = result;
          }}
          onAvailableTasksResult={(result) => {
            availableTasksResult = result;
          }}
        />
      </TaskProviderWrapper>,
    );

    await waitFor(() => {
      expect(tasksResult).not.toBeNull();
      expect(availableTasksResult).not.toBeNull();
    });

    act(() => {
      tasksResult!.addTask("Task 1");
      tasksResult!.addTask("Task 2");
    });

    await waitFor(() => {
      expect(tasksResult!.tasks).toHaveLength(2);
    });

    await waitFor(() => {
      // Tasks are sorted by creation date (newest first), so task-2 comes before task-1
      expect(availableTasksResult!.availableTasks).toHaveLength(2);
      expect(availableTasksResult!.availableTasks[0].title).toBe("Task 2");
      expect(availableTasksResult!.availableTasks[1].title).toBe("Task 1");
      expect(availableTasksResult!.allTasks).toHaveLength(2);
      expect(availableTasksResult!.hasCompletedTasks).toBe(false);
    });
  });

  it("filters out completed tasks", async () => {
    let tasksResult: ReturnType<typeof useTasks> | null = null;
    let availableTasksResult: ReturnType<typeof useAvailableTasks> | null =
      null;

    render(
      <TaskProviderWrapper>
        <TestComponent
          onTasksResult={(result) => {
            tasksResult = result;
          }}
          onAvailableTasksResult={(result) => {
            availableTasksResult = result;
          }}
        />
      </TaskProviderWrapper>,
    );

    await waitFor(() => {
      expect(tasksResult).not.toBeNull();
      expect(availableTasksResult).not.toBeNull();
    });

    let task1Id: string;
    let task2Id: string;
    let task3Id: string;

    act(() => {
      const task1 = tasksResult!.addTask("Task 1");
      task1Id = task1.id;
      const task2 = tasksResult!.addTask("Task 2");
      task2Id = task2.id;
      const task3 = tasksResult!.addTask("Task 3");
      task3Id = task3.id;
    });

    await waitFor(() => {
      expect(tasksResult!.tasks).toHaveLength(3);
    });

    await waitFor(() => {
      expect(availableTasksResult!.availableTasks).toHaveLength(3);
    });

    act(() => {
      tasksResult!.toggleTaskStatus(task2Id!);
    });

    await waitFor(() => {
      expect(availableTasksResult!.availableTasks).toHaveLength(2);
      expect(availableTasksResult!.availableTasks[0].id).toBe(task3Id);
      expect(availableTasksResult!.availableTasks[1].id).toBe(task1Id);
      expect(
        availableTasksResult!.availableTasks.every(
          (task) => task.status === "todo",
        ),
      ).toBe(true);
      expect(availableTasksResult!.allTasks).toHaveLength(3);
      expect(availableTasksResult!.hasCompletedTasks).toBe(false);
    });
  });

  it("sorts tasks by creation date (newest first)", async () => {
    let tasksResult: ReturnType<typeof useTasks> | null = null;
    let availableTasksResult: ReturnType<typeof useAvailableTasks> | null =
      null;

    render(
      <TaskProviderWrapper>
        <TestComponent
          onTasksResult={(result) => {
            tasksResult = result;
          }}
          onAvailableTasksResult={(result) => {
            availableTasksResult = result;
          }}
        />
      </TaskProviderWrapper>,
    );

    await waitFor(() => {
      expect(tasksResult).not.toBeNull();
      expect(availableTasksResult).not.toBeNull();
    });

    act(() => {
      tasksResult!.addTask("Task 1");
      tasksResult!.addTask("Task 2");
      tasksResult!.addTask("Task 3");
    });

    await waitFor(() => {
      expect(tasksResult!.tasks).toHaveLength(3);
    });

    await waitFor(() => {
      expect(availableTasksResult!.availableTasks).toHaveLength(3);
      expect(availableTasksResult!.availableTasks[0].title).toBe("Task 3");
      expect(availableTasksResult!.availableTasks[1].title).toBe("Task 2");
      expect(availableTasksResult!.availableTasks[2].title).toBe("Task 1");
    });
  });

  it("returns empty array when no tasks exist", async () => {
    const { result } = renderHook(() => useAvailableTasks(), {
      wrapper: TaskProviderWrapper,
    });

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual([]);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });

  it("updates when tasks change", async () => {
    let tasksResult: ReturnType<typeof useTasks> | null = null;
    let availableTasksResult: ReturnType<typeof useAvailableTasks> | null =
      null;

    render(
      <TaskProviderWrapper>
        <TestComponent
          onTasksResult={(result) => {
            tasksResult = result;
          }}
          onAvailableTasksResult={(result) => {
            availableTasksResult = result;
          }}
        />
      </TaskProviderWrapper>,
    );

    await waitFor(() => {
      expect(tasksResult).not.toBeNull();
      expect(availableTasksResult).not.toBeNull();
    });

    act(() => {
      tasksResult!.addTask("Task 1");
    });

    await waitFor(() => {
      expect(tasksResult!.tasks).toHaveLength(1);
    });

    await waitFor(() => {
      expect(availableTasksResult!.availableTasks).toHaveLength(1);
    });

    act(() => {
      tasksResult!.addTask("Task 2");
    });

    await waitFor(() => {
      expect(tasksResult!.tasks).toHaveLength(2);
    });

    await waitFor(() => {
      expect(availableTasksResult!.availableTasks).toHaveLength(2);
    });
  });

  it("returns hasCompletedTasks as true when all tasks are completed", async () => {
    let tasksResult: ReturnType<typeof useTasks> | null = null;
    let availableTasksResult: ReturnType<typeof useAvailableTasks> | null =
      null;

    render(
      <TaskProviderWrapper>
        <TestComponent
          onTasksResult={(result) => {
            tasksResult = result;
          }}
          onAvailableTasksResult={(result) => {
            availableTasksResult = result;
          }}
        />
      </TaskProviderWrapper>,
    );

    await waitFor(() => {
      expect(tasksResult).not.toBeNull();
      expect(availableTasksResult).not.toBeNull();
    });

    let task1Id: string;
    let task2Id: string;

    act(() => {
      const task1 = tasksResult!.addTask("Task 1");
      task1Id = task1.id;
      const task2 = tasksResult!.addTask("Task 2");
      task2Id = task2.id;
    });

    await waitFor(() => {
      expect(tasksResult!.tasks).toHaveLength(2);
    });

    await waitFor(() => {
      expect(availableTasksResult!.availableTasks).toHaveLength(2);
    });

    act(() => {
      tasksResult!.toggleTaskStatus(task1Id);
      tasksResult!.toggleTaskStatus(task2Id);
    });

    await waitFor(() => {
      expect(availableTasksResult!.availableTasks).toEqual([]);
      expect(availableTasksResult!.allTasks).toHaveLength(2);
      expect(availableTasksResult!.hasCompletedTasks).toBe(true);
    });
  });

  it("returns hasCompletedTasks as false when no tasks exist", async () => {
    const { result } = renderHook(() => useAvailableTasks(), {
      wrapper: TaskProviderWrapper,
    });

    await waitFor(() => {
      expect(result.current.availableTasks).toEqual([]);
      expect(result.current.allTasks).toEqual([]);
      expect(result.current.hasCompletedTasks).toBe(false);
    });
  });
});
