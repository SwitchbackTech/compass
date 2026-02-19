import { useEffect, useRef } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { Task } from "@web/common/types/task.types";
import { useSaveTasksByDateEffect } from "@web/views/Day/hooks/tasks/useSaveTasksByDateEffect";

const mockPutTasks = jest.fn();
jest.mock("@web/common/storage/adapter/adapter", () => ({
  ensureStorageReady: jest.fn().mockResolvedValue(undefined),
  getStorageAdapter: jest.fn(() => ({
    putTasks: mockPutTasks,
    putTask: jest.fn().mockResolvedValue(undefined),
  })),
}));

interface SaveHarnessProps {
  dateKey: string;
  tasks: Task[];
  isLoadingTasks: boolean;
  didLoadFail: boolean;
  loadedDateKey: string | null;
  isDirty: boolean;
}

function useSaveHarness({
  dateKey,
  tasks,
  isLoadingTasks,
  didLoadFail,
  loadedDateKey,
  isDirty,
}: SaveHarnessProps) {
  const isDirtyRef = useRef(isDirty);
  const saveRequestIdRef = useRef(0);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useSaveTasksByDateEffect({
    dateKey,
    tasks,
    isLoadingTasks,
    didLoadFail,
    loadedDateKey,
    isDirtyRef,
    saveRequestIdRef,
  });

  return { isDirtyRef };
}

describe("useSaveTasksByDateEffect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPutTasks.mockResolvedValue(undefined);
  });

  it("saves tasks and clears dirty flag when all guards pass", async () => {
    const tasks = [createMockTask({ _id: "task-1" })];

    const { result } = renderHook(() =>
      useSaveHarness({
        dateKey: "2025-10-27",
        tasks,
        isLoadingTasks: false,
        didLoadFail: false,
        loadedDateKey: "2025-10-27",
        isDirty: true,
      }),
    );

    await waitFor(() => {
      expect(mockPutTasks).toHaveBeenCalledWith("2025-10-27", tasks);
      expect(result.current.isDirtyRef.current).toBe(false);
    });
  });

  it("does not save when any guard blocks persistence", async () => {
    const tasks = [createMockTask({ _id: "task-1" })];

    renderHook(() =>
      useSaveHarness({
        dateKey: "2025-10-27",
        tasks,
        isLoadingTasks: true,
        didLoadFail: false,
        loadedDateKey: "2025-10-27",
        isDirty: true,
      }),
    );

    renderHook(() =>
      useSaveHarness({
        dateKey: "2025-10-27",
        tasks,
        isLoadingTasks: false,
        didLoadFail: true,
        loadedDateKey: "2025-10-27",
        isDirty: true,
      }),
    );

    renderHook(() =>
      useSaveHarness({
        dateKey: "2025-10-27",
        tasks,
        isLoadingTasks: false,
        didLoadFail: false,
        loadedDateKey: "2025-10-28",
        isDirty: true,
      }),
    );

    renderHook(() =>
      useSaveHarness({
        dateKey: "2025-10-27",
        tasks,
        isLoadingTasks: false,
        didLoadFail: false,
        loadedDateKey: "2025-10-27",
        isDirty: false,
      }),
    );

    await waitFor(() => {
      expect(mockPutTasks).not.toHaveBeenCalled();
    });
  });

  it("keeps dirty flag when save fails", async () => {
    const tasks = [createMockTask({ _id: "task-1" })];
    mockPutTasks.mockRejectedValueOnce(new Error("save failed"));
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() =>
      useSaveHarness({
        dateKey: "2025-10-27",
        tasks,
        isLoadingTasks: false,
        didLoadFail: false,
        loadedDateKey: "2025-10-27",
        isDirty: true,
      }),
    );

    await waitFor(() => {
      expect(mockPutTasks).toHaveBeenCalledWith("2025-10-27", tasks);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    expect(result.current.isDirtyRef.current).toBe(true);
    consoleErrorSpy.mockRestore();
  });
});
