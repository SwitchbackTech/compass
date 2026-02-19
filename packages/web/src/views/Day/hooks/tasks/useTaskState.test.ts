import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { Task } from "@web/common/types/task.types";
import { getDateKey } from "@web/common/utils/storage/storage.util";
import { useTaskState } from "@web/views/Day/hooks/tasks/useTaskState";

const mockGetTasks = jest.fn();
const mockPutTasks = jest.fn().mockResolvedValue(undefined);
jest.mock("@web/common/storage/adapter/adapter", () => ({
  ensureStorageReady: jest.fn().mockResolvedValue(undefined),
  getStorageAdapter: jest.fn(() => ({
    getTasks: mockGetTasks,
    putTasks: mockPutTasks,
    putTask: jest.fn().mockResolvedValue(undefined),
  })),
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
  const dayOneDate = new Date("2025-10-27T12:00:00.000Z");
  const dayTwoDate = new Date("2025-10-28T12:00:00.000Z");
  const dayOneKey = getDateKey(dayOneDate);
  const dayTwoKey = getDateKey(dayTwoDate);

  beforeEach(() => {
    jest.clearAllMocks();
    mockPutTasks.mockResolvedValue(undefined);
    mockGetTasks.mockReset();
  });

  it("clears tasks and enters loading state when date changes", async () => {
    const dayTwoLoad = createDeferred<Task[]>();
    mockGetTasks
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
    mockGetTasks
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(dayTwoLoad.promise);

    const { result, rerender } = renderHook(
      ({ currentDate }) => useTaskState({ currentDate }),
      { initialProps: { currentDate: dayOneDate } },
    );

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
    });

    const localTask = createMockTask({ _id: "task-1", title: "Local task" });

    act(() => {
      result.current.setTasks([localTask]);
    });

    await waitFor(() => {
      expect(mockPutTasks).toHaveBeenCalledWith(dayOneKey, [localTask]);
    });

    mockPutTasks.mockClear();

    rerender({ currentDate: dayTwoDate });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPutTasks).not.toHaveBeenCalledWith(dayTwoKey, expect.any(Array));
    expect(mockPutTasks).not.toHaveBeenCalled();

    await act(async () => {
      dayTwoLoad.resolve([]);
      await dayTwoLoad.promise;
    });
  });

  it("does not save empty tasks after a load failure", async () => {
    mockGetTasks.mockRejectedValue(new Error("load failed"));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() =>
      useTaskState({ currentDate: dayOneDate }),
    );

    await waitFor(() => {
      expect(result.current.isLoadingTasks).toBe(false);
      expect(result.current.didLoadFail).toBe(true);
      expect(result.current.tasks).toEqual([]);
    });

    expect(mockPutTasks).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
