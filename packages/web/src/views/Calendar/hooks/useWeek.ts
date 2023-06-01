import { useEffect, useMemo, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useAppDispatch } from "@web/store/store.hooks";
import { toUTCOffset } from "@web/common/utils/web.date.util";
import { getWeekEventsSlice } from "@web/ducks/events/slices/week.slice";
import { getSomedayEventsSlice } from "@web/ducks/events/slices/someday.slice";
import { Category_View } from "@web/views/Calendar/calendarView.types";

export const useWeek = (today: Dayjs) => {
  const dispatch = useAppDispatch();

  const origStart = useMemo(() => today.startOf("week"), [today]);
  const [start, setStartOfView] = useState(origStart);
  const end = useMemo(() => start.endOf("week"), [start]);
  const week = useMemo(() => start.week(), [start]);

  const isCurrentWeek = today.week() === start.week();

  const weekDays = [...(new Array(7) as number[])].map((_, index) => {
    return start.add(index, "day");
  });

  const tempStart = dayjs("2023-05-01");
  const tempEnd = dayjs("2023-05-31");

  useEffect(() => {
    dispatch(
      getWeekEventsSlice.actions.request({
        startDate: toUTCOffset(start),
        endDate: toUTCOffset(end),
      })
    );

    dispatch(
      getSomedayEventsSlice.actions.request({
        startDate: toUTCOffset(tempStart),
        endDate: toUTCOffset(tempEnd),
      })
    );
  }, [end, start, tempEnd, dispatch, tempStart]);

  const decrementWeek = () => {
    setStartOfView(start.subtract(7, "day"));
  };

  const goToToday = () => {
    if (today.week() !== start.week()) {
      setStartOfView(today.startOf("week"));
    }
  };

  const incrementWeek = () => {
    setStartOfView(start.add(7, "day"));
  };

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
    util: { decrementWeek, goToToday, incrementWeek },
  };
  return weekProps;
};

export type WeekProps = ReturnType<typeof useWeek>;
