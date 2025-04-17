import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";

dayjs.extend(utc);
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat); // for RFC5545 iCalendar format

const RFC5545_FORMAT = "YYYYMMDD[T]HHmmss[Z]";

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
 * Convert RFC5545 iCalendar format to ISO string
 * @param orig - The original string in RFC5545 (e.g., "20251207T155933Z")
 * @returns Parsed date as ISO string
 */
export const convertRfc5545ToIso = (orig: string) => {
  const untilParsed = dayjs.utc(orig, RFC5545_FORMAT);

  if (!untilParsed.isValid()) return null;

  return untilParsed.toISOString();
};

/**
 * Convert ISO string to RFC5545 iCalendar format
 * @param orig - The original ISO string (e.g., "2025-12-07T15:59:33Z")
 * @returns Converted string in RFC5545 format
 */
export const convertToRfc5545 = (orig: string) => {
  const iso = dayjs.utc(orig);
  if (!iso.isValid()) return null;

  return iso.format(RFC5545_FORMAT);
};
