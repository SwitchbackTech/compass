import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";

dayjs.extend(weekOfYear);

export const getCurrentRangeDates = () => {
  const now = dayjs();

  const weekStart = now.startOf("week");
  const weekEnd = now.endOf("week");

  const monthStart = now.startOf("month");
  const monthEnd = now.endOf("month");

  return {
    week: {
      startDate: weekStart.format(YEAR_MONTH_DAY_FORMAT),
      endDate: weekEnd.format(YEAR_MONTH_DAY_FORMAT),
    },
    month: {
      startDate: monthStart.format(YEAR_MONTH_DAY_FORMAT),
      endDate: monthEnd.format(YEAR_MONTH_DAY_FORMAT),
    },
  };
};

export const isSameMonth = (start: string, end: string) => {
  const _start = dayjs(start);
  const _end = dayjs(end);

  const isSameMonth = _start.format("M") === _end.format("M");
  return isSameMonth;
};

export const minutesFromNow = (numMin: number, format: string) => {
  if (format === "ms") {
    const MS_IN_MIN = 60000;
    const msToAdd = numMin * MS_IN_MIN;
    const minFromNow = Date.now() + msToAdd;
    return minFromNow;
  } else {
    return -666;
  }
};

/**
 * Extract the UNTIL value from a recurrence date string
 * @param date - The date to get the until value for
 * @returns The until value for the base event
 */
export const getUntilValue = (date: string) => {
  // Update the original base event to end before the modified instance
  const untilDate =
    new Date(date).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return untilDate;
};
