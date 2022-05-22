import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Dayjs } from "dayjs";
import { toUTCOffset } from "@web/common/utils/date.utils";
import { getWeekEventsSlice } from "@web/ducks/events/event.slice";
import { Category_View } from "@web/views/Calendar/calendarView.types";

export const useWeek = (today: Dayjs) => {
  const dispatch = useDispatch();

  const [week, setWeek] = useState(today.week());
  // ++ const [viewStart, setViewStart] = useState(today.week(week).startOf("week"));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week]);

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

/* 
  //++
  // const getOverflowPercent = () => {
  //   if (weekProps.component.week < today.week()) {
  //     return 100;
  //   }
  //   const _currentWidths = [...columnWidths.current];
  //   const todayIndex = today.get("day");

  //   const daysBeforeToday = _currentWidths.splice(0, todayIndex);
  //   const daysBeforeTodayPercent = sum(daysBeforeToday);

  //   return daysBeforeTodayPercent;
  // };

  // const getWidthByIndex = (i: number) =>
  //   isCurrentWeek ? columnWidths.current[i] : columnWidths.pastFuture;
*/
