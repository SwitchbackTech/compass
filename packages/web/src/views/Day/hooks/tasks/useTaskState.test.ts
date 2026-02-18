import { act, renderHook, waitFor } from "@testing-library/react";
import { Task } from "@web/common/types/task.types";
import { getDateKey } from "@web/common/utils/storage/storage.util";
import * as taskStorageUtil from "@web/common/utils/storage/task.storage.util";
import { useTaskState } from "@web/views/Day/hooks/tasks/useTaskState";

jest.mock("@web/common/utils/storage/task.storage.util", () => ({
  loadTasksFromIndexedDB: jest.fn(),
  saveTasksToIndexedDB: jest.fn().mockResolvedValue(undefined),
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

describe("useTaskState", () => {
  const loadTasksMock =
    taskStorageUtil.loadTasksFromIndexedDB as jest.MockedFunction<
      typeof taskStorageUtil.loadTasksFromIndexedDB
    >;
  const saveTasksMock =
    taskStorageUtil.saveTasksToIndexedDB as jest.MockedFunction<
      typeof taskStorageUtil.saveTasksToIndexedDB
    >;

  const dayOneDate = new Date("2025-10-27T12:00:00.000Z");
  const dayTwoDate = new Date("2025-10-28T12:00:00.000Z");
  const dayOneKey = getDateKey(dayOneDate);
  const dayTwoKey = getDateKey(dayTwoDate);

  const createTask = (id: string, title: string): Task => ({
    id,
    title,
    status: "todo",
    order: 0,
    createdAt: "2025-10-27T00:00:00.000Z",
  });

  beforeEach(() => {
    jest.clearAllMocks();
    saveTasksMock.mockResolvedValue(undefined);
  });

  it("clears tasks and enters loading state when date changes", async () => {
    const dayTwoLoad = createDeferred<Task[]>();
    loadTasksMock
      .mockResolvedValueOnce([createTask("task-1", "Loaded task")])
      .mockReturnValueOnce(dayTwoLoad.promise);

    const { result, rerender } = renderHook(
      ({ currentDate }) => useTaskState({ currentDate }),
      { initialProps: { currentDate: dayOneDate } },
    );

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.tasks).toHaveLength(1);
    });

    rerender({ currentDate: dayTwoDate });

    expect(result.current.isLoadingTasks).toBe(true);
    expect(result.current.tasks).toEqual([]);

    await act(async () => {
      dayTwoLoad.resolve([]);
      await dayTwoLoad.promise;
    });

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
    });
  });

  it("does not save previous-day tasks under the next date key", async () => {
    const dayTwoLoad = createDeferred<Task[]>();
    loadTasksMock
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(dayTwoLoad.promise);

    const { result, rerender } = renderHook(
      ({ currentDate }) => useTaskState({ currentDate }),
      { initialProps: { currentDate: dayOneDate } },
    );

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
    });

    act(() => {
      result.current.setTasks([createTask("task-1", "Local task")]);
    });

    await waitFor(() => {
      expect(saveTasksMock).toHaveBeenCalledWith(dayOneKey, [
        createTask("task-1", "Local task"),
      ]);
    });

    saveTasksMock.mockClear();

    rerender({ currentDate: dayTwoDate });

    await act(async () => {
      await Promise.resolve();
    });

    expect(saveTasksMock).not.toHaveBeenCalledWith(
      dayTwoKey,
      expect.any(Array),
    );
    expect(saveTasksMock).not.toHaveBeenCalled();

    await act(async () => {
      dayTwoLoad.resolve([]);
      await dayTwoLoad.promise;
    });
  });

  it("does not save empty tasks after a load failure", async () => {
    loadTasksMock.mockRejectedValueOnce(new Error("load failed"));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() =>
      useTaskState({ currentDate: dayOneDate }),
    );

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.didLoadFail).toBe(true);
      expect(result.current.tasks).toEqual([]);
    });

    expect(saveTasksMock).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
