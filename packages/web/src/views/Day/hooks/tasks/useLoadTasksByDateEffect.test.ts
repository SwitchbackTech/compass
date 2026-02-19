import { act } from "react";
import { useRef, useState } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { Task } from "@web/common/types/task.types";
import * as taskStorageUtil from "@web/common/utils/storage/task.storage.util";
import { useLoadTasksByDateEffect } from "@web/views/Day/hooks/tasks/useLoadTasksByDateEffect";

jest.mock("@web/common/utils/storage/task.storage.util", () => ({
  loadTasksFromIndexedDB: jest.fn(),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function createTask(
  id: string,
  status: "todo" | "completed",
  order: number,
): Task {
  return {
    id,
    title: id,
    status,
    order,
    createdAt: "2025-10-27T00:00:00.000Z",
  };
}

function useLoadHarness(dateKey: string) {
  const [tasks, setTasksState] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [didLoadFail, setDidLoadFail] = useState(false);
  const [loadedDateKey, setLoadedDateKey] = useState<string | null>(null);
  const isDirtyRef = useRef(true);
  const loadRequestIdRef = useRef(0);

  useLoadTasksByDateEffect({
    dateKey,
    setTasksState,
    setIsLoadingTasks,
    setDidLoadFail,
    setLoadedDateKey,
    isDirtyRef,
    loadRequestIdRef,
  });

  return {
    tasks,
    isLoadingTasks,
    didLoadFail,
    loadedDateKey,
    isDirtyRef,
  };
}

describe("useLoadTasksByDateEffect", () => {
  const loadTasksMock =
    taskStorageUtil.loadTasksFromIndexedDB as jest.MockedFunction<
      typeof taskStorageUtil.loadTasksFromIndexedDB
    >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads tasks for date and sorts by status/order", async () => {
    loadTasksMock.mockResolvedValueOnce([
      createTask("completed-1", "completed", 0),
      createTask("todo-2", "todo", 1),
      createTask("todo-1", "todo", 0),
    ]);

    const { result } = renderHook(() => useLoadHarness("2025-10-27"));

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
    });

    expect(result.current.didLoadFail).toBe(false);
    expect(result.current.loadedDateKey).toBe("2025-10-27");
    expect(result.current.tasks.map((task) => task.id)).toEqual([
      "todo-1",
      "todo-2",
      "completed-1",
    ]);
  });

  it("clears tasks while loading a new date and ignores stale results", async () => {
    const firstLoad = createDeferred<Task[]>();
    const secondLoad = createDeferred<Task[]>();
    loadTasksMock
      .mockReturnValueOnce(firstLoad.promise)
      .mockReturnValueOnce(secondLoad.promise);

    const { result, rerender } = renderHook(
      ({ dateKey }) => useLoadHarness(dateKey),
      { initialProps: { dateKey: "2025-10-27" } },
    );

    await act(async () => {
      rerender({ dateKey: "2025-10-28" });
    });

    expect(result.current.isLoadingTasks).toBe(true);
    expect(result.current.tasks).toEqual([]);

    await act(async () => {
      firstLoad.resolve([createTask("stale-task", "todo", 0)]);
      await Promise.resolve();
    });

    expect(result.current.tasks).toEqual([]);

    await act(async () => {
      secondLoad.resolve([createTask("fresh-task", "todo", 0)]);
      await secondLoad.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.tasks.map((task) => task.id)).toEqual([
        "fresh-task",
      ]);
      expect(result.current.loadedDateKey).toBe("2025-10-28");
    });
  });

  it("sets failed state when load throws", async () => {
    loadTasksMock.mockRejectedValueOnce(new Error("load failed"));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() => useLoadHarness("2025-10-27"));

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.didLoadFail).toBe(true);
      expect(result.current.tasks).toEqual([]);
    });

    consoleErrorSpy.mockRestore();
  });
});
