import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { usePlannerSidebarCalendarDate } from "@web/views/Week/hooks/usePlannerSidebarCalendarDate";
import { describe, expect, it, mock } from "bun:test";

const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

const expectDate = (date: Dayjs, value: string) => {
  expect(date.format(dateFormat)).toBe(value);
};

describe("usePlannerSidebarCalendarDate", () => {
  it("keeps the clicked weekday selected after the week view moves to that week", async () => {
    const setStartOfView = mock();
    const today = dayjs("2026-05-11");
    const { result, rerender } = renderHook(
      ({ viewEnd, viewStart }) =>
        usePlannerSidebarCalendarDate({
          setStartOfView,
          today,
          viewEnd,
          viewStart,
        }),
      {
        initialProps: {
          viewEnd: dayjs("2026-05-16"),
          viewStart: dayjs("2026-05-10"),
        },
      },
    );

    act(() => {
      result.current.goToDateFromSidebar(dayjs("2026-05-18"));
    });

    expectDate(setStartOfView.mock.calls[0]?.[0], "2026-05-17");

    rerender({
      viewEnd: dayjs("2026-05-23"),
      viewStart: dayjs("2026-05-17"),
    });

    await waitFor(() => {
      expectDate(result.current.calendarDate, "2026-05-18");
    });
  });

  it("keeps a clicked date in the current week instead of snapping back to today", async () => {
    const setStartOfView = mock();
    const today = dayjs("2026-05-11");
    const viewStart = dayjs("2026-05-10");
    const viewEnd = dayjs("2026-05-16");
    const { result, rerender } = renderHook(
      (props) => usePlannerSidebarCalendarDate(props),
      {
        initialProps: {
          setStartOfView,
          today,
          viewEnd,
          viewStart,
        },
      },
    );

    act(() => {
      result.current.goToDateFromSidebar(dayjs("2026-05-12"));
    });

    rerender({ setStartOfView, today, viewEnd, viewStart });

    await waitFor(() => {
      expectDate(result.current.calendarDate, "2026-05-12");
    });
  });

  it("uses today when outside navigation returns to the current week", async () => {
    const setStartOfView = mock();
    const today = dayjs("2026-05-11");
    const { result, rerender } = renderHook(
      ({ viewEnd, viewStart }) =>
        usePlannerSidebarCalendarDate({
          setStartOfView,
          today,
          viewEnd,
          viewStart,
        }),
      {
        initialProps: {
          viewEnd: dayjs("2026-05-23"),
          viewStart: dayjs("2026-05-17"),
        },
      },
    );

    act(() => {
      result.current.goToDateFromSidebar(dayjs("2026-05-18"));
    });

    rerender({
      viewEnd: dayjs("2026-05-16"),
      viewStart: dayjs("2026-05-10"),
    });

    await waitFor(() => {
      expectDate(result.current.calendarDate, "2026-05-11");
    });
  });
});
