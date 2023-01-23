import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Dayjs } from "dayjs";
import { toUTCOffset } from "@web/common/utils/web.date.util";
import { getWeekEventsSlice } from "@web/ducks/events/event.slice";
import { Category_View } from "@web/views/Calendar/calendarView.types";

export const useWeek = (today: Dayjs) => {
  const dispatch = useDispatch();

  const origStart = useMemo(() => today.startOf("week"), [today]);
  const [start, setStartOfView] = useState(origStart);
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
      })
    );
  }, [dispatch, end, start]);

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
