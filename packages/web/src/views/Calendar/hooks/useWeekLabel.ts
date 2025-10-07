import dayjs, { Dayjs } from "dayjs";
import { useMemo } from "react";
import { useToday } from "./useToday";

export const useWeekLabel = (weekLabel: string, viewStart: Dayjs) => {
  const { today } = useToday();

  const processedWeekLabel = useMemo(() => {
    return getSomedayWeekLabel(weekLabel, viewStart, today);
  }, [weekLabel, viewStart, today]);

  return processedWeekLabel;
};

export const getSomedayWeekLabel = (
  label: string,
  viewStart: Dayjs,
  today: Dayjs,
): string => {
  return isCurrentWeek(label, viewStart, today) ? "This Week" : label;
};

export const isCurrentWeek = (
  label: string,
  viewStart: Dayjs,
  today: Dayjs,
): boolean => {
  const parts = label.split(" - ");
  if (parts.length != 2) return false;

  const [start, end] = label.split(" - ");
  const [startMonth, startDay] = start.split(".").map(Number);
  let [endMonth, endDay] = end.split(".").map(Number);

  const startYear = viewStart.year();
  let endYear = startYear;
  if (startMonth === 12 && endMonth === 1) {
    endYear = startYear + 1;
  }

  if (endDay === undefined) {
    endDay = endMonth;
    endMonth = startMonth;
  }

  const startDate = dayjs(`${startYear}-${startMonth}-${startDay}`).startOf(
    "day",
  );
  const endDate = dayjs(`${endYear}-${endMonth}-${endDay}`).endOf("day");
  const todayDate = today.startOf("day");

  return (
    todayDate.isSame(startDate) ||
    (todayDate.isAfter(startDate) && todayDate.isBefore(endDate)) ||
    todayDate.isSame(endDate)
  );
};
