import { useCallback, useEffect, useState } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

interface PlannerSidebarCalendarDateArgs {
  currentDate: Dayjs;
  today: Dayjs;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}

interface UsePlannerSidebarCalendarDateArgs {
  setStartOfView: (date: Dayjs) => void;
  today: Dayjs;
  viewEnd: Dayjs;
  viewStart: Dayjs;
}

const dateFormat = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

function resolvePlannerSidebarCalendarDate({
  currentDate,
  today,
  viewEnd,
  viewStart,
}: PlannerSidebarCalendarDateArgs) {
  if (currentDate.isBetween(viewStart, viewEnd, "day", "[]")) {
    return currentDate;
  }

  if (today.isBetween(viewStart, viewEnd, "day", "[]")) {
    return today;
  }

  return viewStart;
}

export function usePlannerSidebarCalendarDate({
  setStartOfView,
  today,
  viewEnd,
  viewStart,
}: UsePlannerSidebarCalendarDateArgs) {
  const [calendarDate, setCalendarDate] = useState(() =>
    resolvePlannerSidebarCalendarDate({
      currentDate: today,
      today,
      viewEnd,
      viewStart,
    }),
  );

  const todayKey = today.format(dateFormat);
  const viewEndKey = viewEnd.format(dateFormat);
  const viewStartKey = viewStart.format(dateFormat);

  useEffect(() => {
    const nextToday = dayjs(todayKey, dateFormat);
    const nextViewEnd = dayjs(viewEndKey, dateFormat);
    const nextViewStart = dayjs(viewStartKey, dateFormat);

    setCalendarDate((currentDate) =>
      resolvePlannerSidebarCalendarDate({
        currentDate,
        today: nextToday,
        viewEnd: nextViewEnd,
        viewStart: nextViewStart,
      }),
    );
  }, [todayKey, viewEndKey, viewStartKey]);

  const goToDateFromSidebar = useCallback(
    (date: Dayjs) => {
      setCalendarDate(date);
      setStartOfView(date.startOf("week"));
    },
    [setStartOfView],
  );

  return { calendarDate, goToDateFromSidebar };
}
