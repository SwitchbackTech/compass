import { Active, Over } from "@dnd-kit/core";
import { createMockTask } from "@core/__tests__/helpers/task.factory";
import dayjs from "@core/util/date/dayjs";
import * as agendaUtil from "@web/views/Day/util/agenda/agenda.util";
import { handleTaskToEventConversion } from "./handleTaskToEventConversion";

jest.mock("@web/views/Day/util/agenda/agenda.util");

describe("handleTaskToEventConversion", () => {
  const userId = "user123";
  const dateInView = dayjs("2024-01-15");
  const mockTask = createMockTask({
    title: "Test Task",
    description: "Test Description",
  });

  const mockActive: Active = {
    id: "task-1",
    data: {
      current: {},
    },
    rect: {
      current: {
        initial: null,
        translated: null,
      },
    },
  };

  const mockOver: Over = {
    id: "grid-main",
    data: {
      current: {},
    },
    rect: {
      width: 0,
      height: 0,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a timed event when isAllDay is false", () => {
    const snappedMinutes = 600; // 10:00 AM
    (agendaUtil.getSnappedMinutes as jest.Mock).mockReturnValue(snappedMinutes);

    const result = handleTaskToEventConversion(
      mockTask,
      mockActive,
      mockOver,
      dateInView,
      userId,
      false,
    );

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test Task");
    expect(result?.description).toBe("Test Description");
    expect(result?.isAllDay).toBe(false);
    expect(result?.user).toBe(userId);

    // Check that startDate is set to 10:00 AM on the dateInView
    const startDate = dayjs(result?.startDate);
    expect(startDate.format("YYYY-MM-DD HH:mm")).toBe("2024-01-15 10:00");

    // Check that endDate is 30 minutes after startDate
    const endDate = dayjs(result?.endDate);
    expect(endDate.diff(startDate, "minute")).toBe(30);
  });

  it("should create an all-day event when isAllDay is true", () => {
    const result = handleTaskToEventConversion(
      mockTask,
      mockActive,
      mockOver,
      dateInView,
      userId,
      true,
    );

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test Task");
    expect(result?.isAllDay).toBe(true);
    expect(result?.user).toBe(userId);

    // Check that startDate is at the start of the day
    const startDate = dayjs(result?.startDate);
    expect(startDate.format("YYYY-MM-DD HH:mm")).toBe("2024-01-15 00:00");
  });

  it("should return null when getSnappedMinutes returns null for timed events", () => {
    (agendaUtil.getSnappedMinutes as jest.Mock).mockReturnValue(null);

    const result = handleTaskToEventConversion(
      mockTask,
      mockActive,
      mockOver,
      dateInView,
      userId,
      false,
    );

    expect(result).toBeNull();
  });

  it("should not call getSnappedMinutes for all-day events", () => {
    const getSnappedMinutesSpy = jest.spyOn(agendaUtil, "getSnappedMinutes");

    handleTaskToEventConversion(
      mockTask,
      mockActive,
      mockOver,
      dateInView,
      userId,
      true,
    );

    expect(getSnappedMinutesSpy).not.toHaveBeenCalled();
  });
});
