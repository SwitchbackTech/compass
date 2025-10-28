import dayjs from "dayjs";
import { act, renderHook } from "@testing-library/react";
import * as storageUtil from "../../util/storage.util";
import { useTaskActions } from "./useTaskActions";

jest.mock("../../util/storage.util", () => ({
  ...jest.requireActual("../../util/storage.util"),
  loadTasksFromStorage: jest.fn(),
  saveTasksToStorage: jest.fn(),
  moveTaskToDate: jest.fn(),
}));

jest.mock("../../components/MigrationToast", () => ({
  showMigrationToast: jest.fn(),
}));

describe("useTaskActions - migration", () => {
  const mockSetTasks = jest.fn();
  const mockDateInView = dayjs("2025-10-27");
  const mockNavigateToNextDay = jest.fn();
  const mockNavigateToPreviousDay = jest.fn();

  const mockTask = {
    id: "task-1",
    title: "Test Task",
    status: "todo" as const,
    createdAt: "2025-10-27T10:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (storageUtil.loadTasksFromStorage as jest.Mock).mockReturnValue([]);
  });

  it("migrates task forward one day", () => {
    const { result } = renderHook(() =>
      useTaskActions({
        setTasks: mockSetTasks,
        tasks: [mockTask],
        dateInView: mockDateInView,
        navigateToNextDay: mockNavigateToNextDay,
        navigateToPreviousDay: mockNavigateToPreviousDay,
      }),
    );

    act(() => {
      result.current.migrateTask(mockTask.id, "forward");
    });

    // Should remove task from current day
    expect(mockSetTasks).toHaveBeenCalledWith(expect.any(Function));

    // Should move task from current date to next date
    expect(storageUtil.moveTaskToDate).toHaveBeenCalledWith(
      mockTask,
      "2025-10-27",
      "2025-10-28",
    );
  });

  it("migrates task backward one day", () => {
    const { result } = renderHook(() =>
      useTaskActions({
        setTasks: mockSetTasks,
        tasks: [mockTask],
        dateInView: mockDateInView,
        navigateToNextDay: mockNavigateToNextDay,
        navigateToPreviousDay: mockNavigateToPreviousDay,
      }),
    );

    act(() => {
      result.current.migrateTask(mockTask.id, "backward");
    });

    // Should move task from current date to previous date
    expect(storageUtil.moveTaskToDate).toHaveBeenCalledWith(
      mockTask,
      "2025-10-27",
      "2025-10-26",
    );
  });
});
