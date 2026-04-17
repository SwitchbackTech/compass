import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { type TaskRepository } from "@web/common/repositories/task/task.repository";
import { type Task } from "@web/common/types/task.types";
import { getDateKey } from "@web/common/utils/storage/storage.util";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { afterAll } from "bun:test";

if (typeof document === "undefined") {
  GlobalRegistrator.register();
}

const mockEnsureStorageReady = mock().mockResolvedValue(undefined);
const mockGet = mock();
const mockSave = mock().mockResolvedValue(undefined);
const mockTaskRepository: TaskRepository = {
  get: mockGet,
  save: mockSave,
  delete: mock().mockResolvedValue(undefined),
  move: mock().mockResolvedValue(undefined),
  reorder: mock().mockResolvedValue(undefined),
};

mock.module("@web/common/storage/adapter/adapter", () => ({
  getStorageAdapter: mock(),
  ensureStorageReady: mockEnsureStorageReady,
}));

const { useTaskState } =
  require("@web/views/Day/hooks/tasks/useTaskState") as typeof import("@web/views/Day/hooks/tasks/useTaskState");

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

/**
 * Drain microtasks so useLoadTasksByDateEffect's async chain (ensureStorageReady → get →
 * .then / .catch) runs inside act. Two ticks are not always enough across environments.
 */
async function flushTaskLoadFromRepository() {
  await act(async () => {
    for (let i = 0; i < 4; i++) {
      await Promise.resolve();
    }
  });
}

describe("useTaskState", () => {
  const dayOneDate = new Date("2025-10-27T12:00:00.000Z");
  const dayTwoDate = new Date("2025-10-28T12:00:00.000Z");
  const dayOneKey = getDateKey(dayOneDate);
  const dayTwoKey = getDateKey(dayTwoDate);

  beforeEach(() => {
    mockEnsureStorageReady.mockClear();
    mockSave.mockResolvedValue(undefined);
    mockSave.mockClear();
    mockGet.mockReset();
  });

  it("clears tasks and enters loading state when date changes", async () => {
    const dayTwoLoad = createDeferred<Task[]>();
    mockGet
      .mockResolvedValueOnce([
        createMockTask({
          _id: "task-1",
          title: "Loaded task",
          status: "todo",
          order: 0,
          createdAt: "2025-10-27T12:00:00.000Z",
          user: "user-1",
        }),
      ])
      .mockReturnValueOnce(dayTwoLoad.promise);

    const { result, rerender } = renderHook(
      ({ currentDate }) =>
        useTaskState({ currentDate, taskRepository: mockTaskRepository }),
      { initialProps: { currentDate: dayOneDate } },
    );

    await flushTaskLoadFromRepository();

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.tasks).toHaveLength(1);
    });

    act(() => {
      rerender({ currentDate: dayTwoDate });
    });

    expect(result.current.isLoadingTasks).toBe(true);
    expect(result.current.tasks).toEqual([]);

    await act(async () => {
      dayTwoLoad.resolve([]);
      await dayTwoLoad.promise;
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
    });
  });

  it("does not save previous-day tasks under the next date key", async () => {
    const dayTwoLoad = createDeferred<Task[]>();
    mockGet.mockResolvedValueOnce([]).mockReturnValueOnce(dayTwoLoad.promise);

    const { result, rerender } = renderHook(
      ({ currentDate, taskRepository }) =>
        useTaskState({ currentDate, taskRepository }),
      {
        initialProps: {
          currentDate: dayOneDate,
          taskRepository: mockTaskRepository,
        },
      },
    );

    await flushTaskLoadFromRepository();

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
    });

    const localTask = createMockTask({ _id: "task-1", title: "Local task" });

    act(() => {
      result.current.setTasks([localTask]);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(dayOneKey, [localTask]);
    });

    mockSave.mockClear();

    act(() => {
      rerender({
        currentDate: dayTwoDate,
        taskRepository: mockTaskRepository,
      });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSave).not.toHaveBeenCalledWith(dayTwoKey, expect.any(Array));
    expect(mockSave).not.toHaveBeenCalled();

    await act(async () => {
      dayTwoLoad.resolve([]);
      await dayTwoLoad.promise;
      await Promise.resolve();
      await Promise.resolve();
    });
  });

  it("does not save empty tasks after a load failure", async () => {
    mockGet.mockRejectedValue(new Error("load failed"));
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

    const { result } = renderHook(() =>
      useTaskState({
        currentDate: dayOneDate,
        taskRepository: mockTaskRepository,
      }),
    );

    await flushTaskLoadFromRepository();

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.didLoadFail).toBe(true);
      expect(result.current.tasks).toEqual([]);
    });

    expect(mockSave).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

afterAll(() => {
  mock.restore();
});
