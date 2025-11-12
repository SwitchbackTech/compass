import { renderHook } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { Day_AsyncStateContextReason } from "@web/ducks/events/context/day.context";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { useDayEvents } from "./useDayEvents";

jest.mock("@web/store/store.hooks", () => ({
  useAppDispatch: jest.fn(),
}));

describe("useDayEvents", () => {
  const dispatchMock = jest.fn();

  beforeEach(() => {
    (useAppDispatch as jest.Mock).mockReturnValue(dispatchMock);
    dispatchMock.mockClear();
  });

  it("dispatches day events request for the provided date", () => {
    const initialDate = dayjs.utc("2025-11-11T00:00:00Z");
    const expectedStart = initialDate.startOf("day").format();
    const expectedEnd = initialDate.endOf("day").format();

    renderHook(() => useDayEvents(initialDate));

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      getDayEventsSlice.actions.request({
        startDate: expectedStart,
        endDate: expectedEnd,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );
  });

  it("re-dispatches when the date range changes", () => {
    const initialDate = dayjs.utc("2025-11-11T00:00:00Z");
    const { rerender } = renderHook(({ date }) => useDayEvents(date), {
      initialProps: { date: initialDate },
    });

    expect(dispatchMock).toHaveBeenCalledTimes(1);

    const nextDate = initialDate.add(1, "day");
    rerender({ date: nextDate });
    const expectedStart = nextDate.startOf("day").format();
    const expectedEnd = nextDate.endOf("day").format();
    expect(dispatchMock).toHaveBeenCalledTimes(2);

    expect(dispatchMock).toHaveBeenNthCalledWith(
      2,
      getDayEventsSlice.actions.request({
        startDate: expectedStart,
        endDate: expectedEnd,
        __context: { reason: Day_AsyncStateContextReason.DAY_VIEW_CHANGE },
      }),
    );
  });
});
