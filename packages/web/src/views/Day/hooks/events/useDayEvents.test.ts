import { renderHook } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { Day_AsyncStateContextReason } from "@web/ducks/events/context/day.context";
import { getDayEventsSlice } from "@web/ducks/events/slices/day.slice";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const dispatchMock = mock();
const useAppDispatch = mock();

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch,
}));

const { useDayEvents } =
  require("@web/views/Day/hooks/events/useDayEvents") as typeof import("@web/views/Day/hooks/events/useDayEvents");

describe("useDayEvents", () => {
  beforeEach(() => {
    useAppDispatch.mockReturnValue(dispatchMock);
    dispatchMock.mockClear();
    useAppDispatch.mockClear();
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

afterAll(() => {
  mock.restore();
});
