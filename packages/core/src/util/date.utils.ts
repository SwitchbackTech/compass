import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";

dayjs.extend(weekOfYear);

export const getCurrentWeekRangeDates = () => {
  const now = dayjs();
  const weekStart = now.startOf("week");
  const weekEnd = now.endOf("week");

  return {
    startDate: weekStart.format(YEAR_MONTH_DAY_FORMAT),
    endDate: weekEnd.format(YEAR_MONTH_DAY_FORMAT),
  };
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
