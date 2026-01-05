import { act, renderHook } from "@testing-library/react";
import { Task } from "@web/common/types/task.types";
import {
  getStoredTasksInitialValue,
  useStoredTasks,
} from "@web/views/Onboarding/hooks/useStoredTasks";

// Mock loadTodayTasks and the custom event name from storage.util
const mockTasks: Task[] = [
  {
    id: "1",
    title: "Task A",
    status: "todo",
    createdAt: new Date().toISOString(),
    order: 0,
  },
  {
    id: "2",
    title: "Task B",
    status: "todo",
    createdAt: new Date().toISOString(),
    order: 0,
  },
];

jest.mock("@web/common/utils/storage/storage.util", () => ({
  loadTodayTasks: jest.fn(),
  COMPASS_TASKS_SAVED_EVENT_NAME: "compass:tasks:saved",
}));

const {
  loadTodayTasks,
  COMPASS_TASKS_SAVED_EVENT_NAME,
} = require("@web/common/utils/storage/storage.util");

// Helper to dispatch the custom event
function fireTasksSavedEvent() {
  const evt = new Event(COMPASS_TASKS_SAVED_EVENT_NAME);
  window.dispatchEvent(evt);
}

describe("useStoredTasks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns tasks from loadTodayTasks on mount", () => {
    (loadTodayTasks as jest.Mock).mockReturnValue(mockTasks);

    const { result } = renderHook(() => useStoredTasks());

    expect(loadTodayTasks).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual(mockTasks);
  });

  it("returns an empty array on server environment", () => {
    const originalWindow = global.window;
    // @ts-expect-error
    delete global.window;
    (loadTodayTasks as jest.Mock).mockReturnValue(mockTasks);
    expect(getStoredTasksInitialValue()).toEqual([]);
    expect(loadTodayTasks).not.toHaveBeenCalled();
    // Restore window
    global.window = originalWindow;
  });

  it("updates tasks when COMPASS_TASKS_SAVED_EVENT_NAME is fired", () => {
    // Initial value
    (loadTodayTasks as jest.Mock).mockReturnValueOnce([{ id: "old" }]);
    const { result } = renderHook(() => useStoredTasks());
    expect(result.current).toEqual([{ id: "old" }]);

    // New value after event
    (loadTodayTasks as jest.Mock).mockReturnValueOnce([
      { id: "old" },
      { id: "new" },
    ]);
    act(() => {
      fireTasksSavedEvent();
    });

    expect(result.current).toEqual([{ id: "old" }, { id: "new" }]);
  });

  it("removes event listener on unmount", () => {
    (loadTodayTasks as jest.Mock).mockReturnValue([{ id: "1" }]);
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useStoredTasks());
    expect(addSpy).toHaveBeenCalledWith(
      COMPASS_TASKS_SAVED_EVENT_NAME,
      expect.any(Function),
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      COMPASS_TASKS_SAVED_EVENT_NAME,
      expect.any(Function),
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
