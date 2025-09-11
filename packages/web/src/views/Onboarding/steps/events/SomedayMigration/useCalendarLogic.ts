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
}

export const useCalendarLogic = (): CalendarData => {
  return useMemo(() => {
    const currentDate = dayjs();
    const currentMonth = currentDate.month();

    // Get the first day of the current month and calculate the starting Sunday
    const firstDayOfMonth = dayjs().startOf("month");
    const firstSunday = firstDayOfMonth.subtract(firstDayOfMonth.day(), "day");

    // Calculate the current week boundaries (Sunday to Saturday)
    const currentWeekStart = currentDate.startOf("week");
    const currentWeekEnd = currentWeekStart.add(6, "day");

    // Check if the current week is visible in this month's calendar
    const calendarEnd = firstSunday.add(35, "day");
    const isCurrentWeekVisible =
      ((currentWeekStart.isAfter(firstSunday) ||
        currentWeekStart.isSame(firstSunday)) &&
        currentWeekStart.isBefore(calendarEnd)) ||
      ((currentWeekEnd.isAfter(firstSunday) ||
        currentWeekEnd.isSame(firstSunday)) &&
        currentWeekEnd.isBefore(calendarEnd)) ||
      (currentWeekStart.isBefore(firstSunday) &&
        (currentWeekEnd.isAfter(firstSunday) ||
          currentWeekEnd.isSame(firstSunday)));

    // Generate calendar data
    const monthTitle = currentDate.format("MMMM");
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

    // Generate 5 weeks of calendar data
    const weeks: CalendarWeek[] = [];
    for (let weekIndex = 0; weekIndex < 5; weekIndex++) {
      const weekStart = firstSunday.add(weekIndex * 7, "day");
      const days: CalendarDay[] = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayDate = weekStart.add(dayIndex, "day");
        const day = dayDate.date();
        const isCurrentMonth = dayDate.month() === currentMonth;
        const isCurrentWeek = dayDate.isBetween(
          currentWeekStart,
          currentWeekEnd,
          "day",
          "[]",
        );
        const isToday = dayDate.isSame(currentDate, "day");

        days.push({
          day,
          isCurrentMonth,
          isCurrentWeek,
          isToday,
        });
      }

      const isCurrentWeekForThisWeek = days.some((day) => day.isCurrentWeek);
      weeks.push({
        days,
        isCurrentWeek: isCurrentWeekForThisWeek,
      });
    }

    return {
      monthTitle,
      weekDays,
      weeks,
      isCurrentWeekVisible,
    };
  }, []);
};
