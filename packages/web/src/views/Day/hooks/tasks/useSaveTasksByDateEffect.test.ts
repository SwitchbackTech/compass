import { useEffect, useRef } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { Task } from "@web/common/types/task.types";
import * as taskStorageUtil from "@web/common/utils/storage/task.storage.util";
import { useSaveTasksByDateEffect } from "@web/views/Day/hooks/tasks/useSaveTasksByDateEffect";

jest.mock("@web/common/utils/storage/task.storage.util", () => ({
  saveTasksToIndexedDB: jest.fn(),
}));

interface SaveHarnessProps {
  dateKey: string;
  tasks: Task[];
  isLoadingTasks: boolean;
  didLoadFail: boolean;
  loadedDateKey: string | null;
  isDirty: boolean;
}

function createTask(id: string): Task {
  return {
    id,
    title: id,
    status: "todo",
    order: 0,
    createdAt: "2025-10-27T00:00:00.000Z",
  };
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
  const saveTasksMock =
    taskStorageUtil.saveTasksToIndexedDB as jest.MockedFunction<
      typeof taskStorageUtil.saveTasksToIndexedDB
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    saveTasksMock.mockResolvedValue(undefined);
  });

  it("saves tasks and clears dirty flag when all guards pass", async () => {
    const tasks = [createTask("task-1")];

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
      expect(saveTasksMock).toHaveBeenCalledWith("2025-10-27", tasks);
      expect(result.current.isDirtyRef.current).toBe(false);
    });
  });

  it("does not save when any guard blocks persistence", async () => {
    const tasks = [createTask("task-1")];

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
      expect(saveTasksMock).not.toHaveBeenCalled();
    });
  });

  it("keeps dirty flag when save fails", async () => {
    const tasks = [createTask("task-1")];
    saveTasksMock.mockRejectedValueOnce(new Error("save failed"));
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
      expect(saveTasksMock).toHaveBeenCalledWith("2025-10-27", tasks);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    expect(result.current.isDirtyRef.current).toBe(true);
    consoleErrorSpy.mockRestore();
  });
});
