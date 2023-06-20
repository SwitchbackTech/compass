import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, Direction_Migrate } from "@core/types/event.types";
import dayjs, { Dayjs } from "dayjs";
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

export const getMigrationDates = (
  origDates: { startDate: string; endDate: string },
  category: Categories_Event,
  direction: Direction_Migrate
) => {
  const dates =
    category === Categories_Event.SOMEDAY_WEEK
      ? _getWeeklyMigrationDates(origDates, direction)
      : _getMonthlyMigrationDates(origDates, direction);

  return {
    startDate: dates.startDate.format(YEAR_MONTH_DAY_FORMAT),
    endDate: dates.endDate.format(YEAR_MONTH_DAY_FORMAT),
  };
};

export const getWeekRangeDates = (weekStart: Dayjs, weekEnd: Dayjs) => {
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

const _getMonthlyMigrationDates = (
  origDates: { startDate: string; endDate: string },
  direction: Direction_Migrate
) => {
  const WEEK_START = 0;
  let startDate: Dayjs;

  if (direction === "forward") {
    const nextMonth = dayjs(origDates.startDate)
      .startOf("month")
      .add(1, "month");
    const buffer = 7; //ensures it's in the next month
    const firstXOfNextMonth = nextMonth.day(WEEK_START + buffer);
    startDate = firstXOfNextMonth;
  } else {
    const prevMonth = dayjs(origDates.startDate)
      .startOf("month")
      .subtract(1, "month");
    const lastDayOfMonth = prevMonth.endOf("month");
    const lastXOfMonth = lastDayOfMonth.day(WEEK_START);

    if (lastDayOfMonth.date() < lastXOfMonth.date()) {
      lastXOfMonth.subtract(7, "days");
    }

    startDate = lastXOfMonth;
  }

  const endDate = startDate.add(6, "days");

  return { startDate, endDate };
};

const _getWeeklyMigrationDates = (
  origDates: { startDate: string; endDate: string },
  direction: Direction_Migrate
) => {
  const diff = direction === "forward" ? 7 : -7;

  const startDate = dayjs(origDates.startDate).add(diff, "days");
  const endDate = dayjs(origDates.endDate).add(diff, "days");

  return { startDate, endDate };
};
