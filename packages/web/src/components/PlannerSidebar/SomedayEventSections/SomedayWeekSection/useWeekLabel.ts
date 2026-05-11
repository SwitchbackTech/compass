import { useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { getWeekRangeLabel } from "@web/common/utils/datetime/web.date.util";
import { useToday } from "@web/views/Week/hooks/useToday";

export const useWeekLabel = (viewStart: Dayjs, viewEnd: Dayjs) => {
  const { today } = useToday();

  const weekLabel = useMemo(() => {
    const label = getWeekRangeLabel(viewStart, viewEnd);
    return getSomedayWeekLabel(label, viewStart, viewEnd, today);
  }, [viewStart, viewEnd, today]);

  return weekLabel;
};

export const getSomedayWeekLabel = (
  label: string,
  viewStart: Dayjs,
  viewEnd: Dayjs,
  today: Dayjs,
): string => {
  return isCurrentWeek(viewStart, viewEnd, today) ? "This Week" : label;
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
