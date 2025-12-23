import { useDndMonitor } from "@dnd-kit/core";
import { renderHook } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { useEventDNDActions } from "@web/common/hooks/useEventDNDActions";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { useAppDispatch } from "@web/store/store.hooks";
import { getSnappedMinutes } from "@web/views/Day/util/agenda/agenda.util";

jest.mock("@dnd-kit/core", () => ({
  useDndMonitor: jest.fn(),
}));

jest.mock("@web/common/hooks/useUpdateEvent", () => ({
  useUpdateEvent: jest.fn(),
}));

jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock("@web/views/Day/util/agenda/agenda.util", () => ({
  getSnappedMinutes: jest.fn(),
}));

describe("useEventDNDActions", () => {
  const mockDispatch = jest.fn();
  const mockUpdateEvent = jest.fn();
  const mockEvent = {
    _id: "event-1",
    startDate: "2023-01-01T10:00:00.000Z",
    endDate: "2023-01-01T11:00:00.000Z",
    isAllDay: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useUpdateEvent as jest.Mock).mockReturnValue(mockUpdateEvent);
  });

  it("should register dnd monitor", () => {
    renderHook(() => useEventDNDActions());
    expect(useDndMonitor).toHaveBeenCalledWith(
      expect.objectContaining({
        onDragEnd: expect.any(Function),
      }),
    );
  });

  describe("onDragEnd", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let onDragEnd: (event: any) => void;

    beforeEach(() => {
      renderHook(() => useEventDNDActions());
      onDragEnd = (useDndMonitor as jest.Mock).mock.calls[0][0].onDragEnd;
    });

    it("should handle timed event move in main grid", () => {
      (getSnappedMinutes as jest.Mock).mockReturnValue(60); // Moved 1 hour

      const active = {
        data: {
          current: {
            view: "day",
            type: Categories_Event.TIMED,
            event: mockEvent,
          },
        },
      };
      const over = { id: ID_GRID_MAIN };

      onDragEnd({ active, over });

      const expectedStartDate = dayjs(mockEvent.startDate)
        .startOf("day")
        .add(60, "minute")
        .toISOString();
      const expectedEndDate = dayjs(expectedStartDate)
        .add(60, "minute")
        .toISOString();

      expect(mockUpdateEvent).toHaveBeenCalledWith(
        {
          event: expect.objectContaining({
            ...mockEvent,
            startDate: expectedStartDate,
            endDate: expectedEndDate,
          }),
        },
        true,
      );
    });

    it("should handle all-day event move to main grid", () => {
      (getSnappedMinutes as jest.Mock).mockReturnValue(120); // Moved 2 hours

      const allDayEvent = { ...mockEvent, isAllDay: true };
      const active = {
        data: {
          current: {
            view: "day",
            type: Categories_Event.ALLDAY,
            event: allDayEvent,
          },
        },
      };
      const over = { id: ID_GRID_MAIN };

      onDragEnd({ active, over });

      const expectedStartDate = dayjs(allDayEvent.startDate)
        .startOf("day")
        .add(120, "minute")
        .toISOString();
      const expectedEndDate = dayjs(expectedStartDate)
        .add(15, "minute")
        .toISOString();

      expect(mockUpdateEvent).toHaveBeenCalledWith(
        {
          event: expect.objectContaining({
            ...allDayEvent,
            isAllDay: false,
            startDate: expectedStartDate,
            endDate: expectedEndDate,
          }),
        },
        true,
      );
    });

    it("should handle timed event move to all-day grid", () => {
      const active = {
        data: {
          current: {
            view: "day",
            type: Categories_Event.TIMED,
            event: mockEvent,
          },
        },
      };
      const over = { id: ID_GRID_ALLDAY_ROW };

      onDragEnd({ active, over });

      const expectedStartDate = dayjs(mockEvent.startDate)
        .startOf("day")
        .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
      const expectedEndDate = dayjs(mockEvent.endDate)
        .startOf("day")
        .add(1, "day")
        .format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);

      expect(mockUpdateEvent).toHaveBeenCalledWith(
        {
          event: expect.objectContaining({
            ...mockEvent,
            isAllDay: true,
            startDate: expectedStartDate,
            endDate: expectedEndDate,
          }),
        },
        true,
      );
    });

    it("should ignore invalid drag end events", () => {
      const active = { data: { current: null } };
      const over = null;

      onDragEnd({ active, over });

      expect(mockUpdateEvent).not.toHaveBeenCalled();
    });
  });
});
