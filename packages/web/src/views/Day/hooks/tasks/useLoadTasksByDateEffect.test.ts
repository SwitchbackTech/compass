import { act } from "react";
import { useRef, useState } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { TaskRepository } from "@web/common/repositories/task/task.repository";
import { Task } from "@web/common/types/task.types";
import { useLoadTasksByDateEffect } from "@web/views/Day/hooks/tasks/useLoadTasksByDateEffect";

const mockGet = jest.fn();
const mockTaskRepository: TaskRepository = {
  get: mockGet,
  save: jest.fn().mockResolvedValue(undefined),
  saveTask: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  move: jest.fn().mockResolvedValue(undefined),
  reorder: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@web/common/storage/adapter/adapter", () => ({
  ensureStorageReady: jest.fn().mockResolvedValue(undefined),
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
    taskRepository: mockTaskRepository,
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
    mockGet.mockReset();
  });

  it("loads tasks for date and sorts by status/order", async () => {
    mockGet.mockResolvedValueOnce([
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
    mockGet
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
    mockGet.mockRejectedValueOnce(new Error("load failed"));
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
