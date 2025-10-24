import { useEffect, useMemo, useRef, useState } from "react";
import { Dayjs } from "@core/util/date/dayjs";
import {
  computeSomedayEventsRequestFilter,
  toUTCOffset,
} from "@web/common/utils/datetime/web.date.util";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { updateDates } from "@web/ducks/events/slices/view.slice";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { Category_View } from "@web/views/Calendar/calendarView.types";

export type WeekNavigationSource = "manual" | "drag-to-edge";

export const useWeek = (today: Dayjs) => {
  const dispatch = useAppDispatch();

  const origStart = useMemo(() => today.startOf("week"), [today]);
  const [start, setStartOfView] = useState(origStart);
  const navigationSourceRef = useRef<WeekNavigationSource>("manual");
  const end = useMemo(() => start.endOf("week"), [start]);

  const week = useMemo(() => start.week(), [start]);

  const isCurrentWeek = today.week() === start.week();

  const weekDays = [...(new Array(7) as number[])].map((_, index) => {
    return start.add(index, "day");
  });

  useEffect(() => {
    dispatch(
      getWeekEventsSlice.actions.request({
        startDate: toUTCOffset(start),
        endDate: toUTCOffset(end),
        __context: {
          reason: Week_AsyncStateContextReason.WEEK_VIEW_CHANGE,
        },
      }),
    );
  }, [dispatch, end, start]);

  const somedayEventsRequestFilter = useMemo(() => {
    return computeSomedayEventsRequestFilter(start, start.endOf("month"));
  }, [start]);

  useEffect(() => {
    dispatch(
      getSomedayEventsSlice.actions.request({
        ...somedayEventsRequestFilter,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    somedayEventsRequestFilter.startDate,
    somedayEventsRequestFilter.endDate,
  ]);

  useEffect(() => {
    dispatch(
      updateDates({
        start: start.format(),
        end: end.format(),
      }),
    );
  }, [dispatch, end, start]);

  const decrementWeek = (source: WeekNavigationSource = "manual") => {
    navigationSourceRef.current = source;
    setStartOfView(start.subtract(7, "day"));
  };

  const goToToday = () => {
    navigationSourceRef.current = "manual";
    if (today.week() !== start.week()) {
      setStartOfView(today.startOf("week"));
    }
  };

  const incrementWeek = (source: WeekNavigationSource = "manual") => {
    navigationSourceRef.current = source;
    setStartOfView(start.add(7, "day"));
  };

  const getLastNavigationSource = () => navigationSourceRef.current;

  const weekProps = {
    component: {
      category: (isCurrentWeek ? "current" : "pastFuture") as Category_View,
      endOfView: end,
      isCurrentWeek,
      startOfView: start,
      week,
      weekDays,
    },
    state: { setStartOfView },
    util: { decrementWeek, goToToday, incrementWeek, getLastNavigationSource },
  };
  return weekProps;
};

export type WeekProps = ReturnType<typeof useWeek>;
