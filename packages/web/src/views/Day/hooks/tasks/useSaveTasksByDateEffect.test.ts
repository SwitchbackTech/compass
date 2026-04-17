import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { renderHook, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { createMockTask } from "@web/__tests__/utils/factories/task.factory";
import { type TaskRepository } from "@web/common/repositories/task/task.repository";
import { type Task } from "@web/common/types/task.types";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { afterAll } from "bun:test";

if (typeof document === "undefined") {
  GlobalRegistrator.register();
}

const mockEnsureStorageReady = mock().mockResolvedValue(undefined);
const mockSave = mock();
const mockTaskRepository: TaskRepository = {
  get: mock().mockResolvedValue([]),
  save: mockSave,
  delete: mock().mockResolvedValue(undefined),
  move: mock().mockResolvedValue(undefined),
  reorder: mock().mockResolvedValue(undefined),
};

mock.module("@web/common/storage/adapter/adapter", () => ({
  ensureStorageReady: mockEnsureStorageReady,
}));

const { useSaveTasksByDateEffect } =
  require("@web/views/Day/hooks/tasks/useSaveTasksByDateEffect") as typeof import("@web/views/Day/hooks/tasks/useSaveTasksByDateEffect");

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
    taskRepository: mockTaskRepository,
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
    mockEnsureStorageReady.mockClear();
    mockSave.mockClear();
    mockSave.mockResolvedValue(undefined);
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
      expect(mockSave).toHaveBeenCalledWith("2025-10-27", tasks);
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
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  it("keeps dirty flag when save fails", async () => {
    const tasks = [createMockTask({ _id: "task-1" })];
    mockSave.mockRejectedValueOnce(new Error("save failed"));
    const consoleErrorSpy = spyOn(console, "error").mockImplementation(
      () => {},
    );

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
      expect(mockSave).toHaveBeenCalledWith("2025-10-27", tasks);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    expect(result.current.isDirtyRef.current).toBe(true);
    consoleErrorSpy.mockRestore();
  });
});

afterAll(() => {
  mock.restore();
});
