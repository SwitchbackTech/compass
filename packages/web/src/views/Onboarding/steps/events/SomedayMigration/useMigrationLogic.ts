import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useMemo } from "react";

// Extend dayjs with isBetween plugin
dayjs.extend(isBetween);

export interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isCurrentWeek: boolean;
  isToday: boolean;
}

export interface CalendarWeek {
  days: CalendarDay[];
  isCurrentWeek: boolean;
}

export interface CalendarData {
  monthTitle: string;
  weekDays: string[];
  weeks: CalendarWeek[];
  isCurrentWeekVisible: boolean;
  currentWeekIndex: number;
  // Additional: a second month (next month) rendered below with same styles
  nextMonthTitle: string;
  nextMonthWeeks: CalendarWeek[];
}

export const useMigrationLogic = (): CalendarData => {
  return useMemo(() => {
    const buildMonth = (baseDate: dayjs.Dayjs) => {
      const month = baseDate.month();
      const firstDayOfMonth = baseDate.startOf("month");
      const firstSunday = firstDayOfMonth.subtract(
        firstDayOfMonth.day(),
        "day",
      );
      const weekStartCurrent = baseDate.startOf("week");
      const weekEndCurrent = weekStartCurrent.add(6, "day");

      const calendarEnd = firstSunday.add(35, "day");
      const isCurrentWeekVisible =
        ((weekStartCurrent.isAfter(firstSunday) ||
          weekStartCurrent.isSame(firstSunday)) &&
          weekStartCurrent.isBefore(calendarEnd)) ||
        ((weekEndCurrent.isAfter(firstSunday) ||
          weekEndCurrent.isSame(firstSunday)) &&
          weekEndCurrent.isBefore(calendarEnd)) ||
        (weekStartCurrent.isBefore(firstSunday) &&
          (weekEndCurrent.isAfter(firstSunday) ||
            weekEndCurrent.isSame(firstSunday)));

      const title = baseDate.format("MMMM YYYY");
      const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

      const weeks: CalendarWeek[] = [];
      let currentWeekIndex = -1;
      for (let weekIndex = 0; weekIndex < 5; weekIndex++) {
        const weekStart = firstSunday.add(weekIndex * 7, "day");
        const days: CalendarDay[] = [];
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const dayDate = weekStart.add(dayIndex, "day");
          const day = dayDate.date();
          const isCurrentMonth = dayDate.month() === month;
          const isCurrentWeek = dayDate.isBetween(
            weekStartCurrent,
            weekEndCurrent,
            "day",
            "[]",
          );
          const isToday = dayDate.isSame(baseDate, "day");
          days.push({ day, isCurrentMonth, isCurrentWeek, isToday });
        }
        const isCurrentWeekForThisWeek = days.some((d) => d.isCurrentWeek);
        if (isCurrentWeekForThisWeek) currentWeekIndex = weekIndex;
        weeks.push({ days, isCurrentWeek: isCurrentWeekForThisWeek });
      }

      return { title, weekDays, weeks, isCurrentWeekVisible, currentWeekIndex };
    };

    const currentDate = dayjs("2025-09-10");
    const thisMonth = buildMonth(currentDate);
    const nextMonth = buildMonth(currentDate.add(1, "month"));

    return {
      monthTitle: thisMonth.title,
      weekDays: thisMonth.weekDays,
      weeks: thisMonth.weeks,
      isCurrentWeekVisible: thisMonth.isCurrentWeekVisible,
      currentWeekIndex: thisMonth.currentWeekIndex,
      nextMonthTitle: nextMonth.title,
      nextMonthWeeks: nextMonth.weeks,
    };
  }, []);
};
