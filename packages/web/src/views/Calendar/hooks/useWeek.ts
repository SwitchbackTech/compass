import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Dayjs } from "dayjs";
import { toUTCOffset } from "@web/common/utils/web.date.util";
import { getWeekEventsSlice } from "@web/ducks/events/event.slice";
import { Category_View } from "@web/views/Calendar/calendarView.types";

export const useWeek = (today: Dayjs) => {
  const dispatch = useDispatch();

  const [week, setWeek] = useState(today.week());

  const dayjsBasedOnWeekDay = today.week(week);
  const endOfSelectedWeekDay = today.week(week).endOf("week");
  const isCurrentWeek = today.week() === week;
  const startOfSelectedWeekDay = today.week(week).startOf("week");

  const weekDays = [...(new Array(7) as number[])].map((_, index) => {
    return startOfSelectedWeekDay.add(index, "day");
  });

  useEffect(() => {
    dispatch(
      getWeekEventsSlice.actions.request({
        startDate: toUTCOffset(startOfSelectedWeekDay),
        endDate: toUTCOffset(endOfSelectedWeekDay),
      })
    );
  }, [dispatch, endOfSelectedWeekDay, startOfSelectedWeekDay, week]);

  const weekProps = {
    component: {
      dayjsBasedOnWeekDay,
      category: (isCurrentWeek ? "current" : "pastFuture") as Category_View,
      endOfSelectedWeekDay,
      isCurrentWeek,
      startOfSelectedWeekDay,
      week,
      weekDays,
    },
    state: { setWeek },
    util: {},
  };
  return weekProps;
};

export type WeekProps = ReturnType<typeof useWeek>;
