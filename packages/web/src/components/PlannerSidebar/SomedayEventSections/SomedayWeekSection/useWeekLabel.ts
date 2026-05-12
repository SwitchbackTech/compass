import { useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useToday } from "@web/views/Week/hooks/useToday";

export const useWeekLabel = (viewStart: Dayjs, viewEnd: Dayjs) => {
  const { today } = useToday();

  const weekLabel = useMemo(() => {
    return getSomedayWeekLabel(viewStart, viewEnd, today);
  }, [viewStart, viewEnd, today]);

  return weekLabel;
};

export const getSomedayWeekLabel = (
  viewStart: Dayjs,
  viewEnd: Dayjs,
  today: Dayjs,
): string => {
  const weekStartLabel = viewStart.format("MMM D");

  return isCurrentWeek(viewStart, viewEnd, today)
    ? "This Week"
    : `Week of ${weekStartLabel}`;
};

export const isCurrentWeek = (
  viewStart: Dayjs,
  viewEnd: Dayjs,
  today: Dayjs,
): boolean => {
  const startDate = viewStart.startOf("day");
  const endDate = viewEnd.endOf("day");
  const todayDate = today.startOf("day");

  return (
    todayDate.isSame(startDate) ||
    (todayDate.isAfter(startDate) && todayDate.isBefore(endDate)) ||
    todayDate.isSame(endDate)
  );
};
