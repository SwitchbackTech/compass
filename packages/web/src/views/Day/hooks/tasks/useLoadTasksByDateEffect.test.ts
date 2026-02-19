import { act } from "react";
import { useRef, useState } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { Task } from "@web/common/types/task.types";
import { useLoadTasksByDateEffect } from "@web/views/Day/hooks/tasks/useLoadTasksByDateEffect";

const mockGetTasks = jest.fn();
jest.mock("@web/common/storage/adapter/adapter", () => ({
  ensureStorageReady: jest.fn().mockResolvedValue(undefined),
  getStorageAdapter: jest.fn(() => ({ getTasks: mockGetTasks })),
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTasks.mockReset();
  });

  it("loads tasks for date and sorts by status/order", async () => {
    mockGetTasks.mockResolvedValueOnce([
      createMockTask({ _id: "completed-1", status: "completed", order: 0 }),
      createMockTask({ _id: "todo-2", status: "todo", order: 1 }),
      createMockTask({ _id: "todo-1", status: "todo", order: 0 }),
    ]);

    const { result } = renderHook(() => useLoadHarness("2025-10-27"));

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
    });

    expect(result.current.didLoadFail).toBe(false);
    expect(result.current.loadedDateKey).toBe("2025-10-27");
    expect(result.current.tasks.map((task) => task._id)).toEqual([
      "todo-1",
      "todo-2",
      "completed-1",
    ]);
  });

  it("clears tasks while loading a new date and ignores stale results", async () => {
    const firstLoad = createDeferred<Task[]>();
    const secondLoad = createDeferred<Task[]>();
    mockGetTasks
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
      firstLoad.resolve([
        createMockTask({ _id: "stale-task", status: "todo", order: 0 }),
      ]);
      await Promise.resolve();
    });

    expect(result.current.tasks).toEqual([]);

    await act(async () => {
      secondLoad.resolve([
        createMockTask({ _id: "fresh-task", status: "todo", order: 0 }),
      ]);
      await secondLoad.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.tasks.map((task) => task._id)).toEqual([
        "fresh-task",
      ]);
      expect(result.current.loadedDateKey).toBe("2025-10-28");
    });
  });

  it("sets failed state when load throws", async () => {
    mockGetTasks.mockRejectedValueOnce(new Error("load failed"));
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
