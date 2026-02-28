import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs, { Dayjs } from "@core/util/date/dayjs";

/**
 * RFC date format definitions for date parsing and formatting
 * Used across the application for consistent date handling
 */
export const FORMAT = {
  RFC5545: {
    key: "RFC5545",
    value: "YYYYMMDD[T]HHmmss[Z]",
  },
  RFC3339: {
    key: "RFC3339",
    value: "YYYY-MM-DD[T]HH:mm:ss[Z]",
  },
  RFC3339_OFFSET: {
    key: "RFC3339_OFFSET",
    value: "YYYY-MM-DDTHH:mm:ssZ",
  },
} as const;
type Key_Format = (typeof FORMAT)[keyof typeof FORMAT]["key"];

/**
 * Convert a recurrence rule with UNTIL value to date
 * @param rrule The full recurrence rule with UNTIL value (e.g. "RRULE:FREQ=DAILY;UNTIL=20260108T005808Z")
 * @returns The UNTIL value, parsed as iso8601 (e.g. '2026-01-08T00:58:08.000Z')
 */
export const convertRruleWithUntilToDate = (rrule: string) => {
  const origDateFromUntil = dayjs
    .utc(rrule, FORMAT.RFC5545.value)
    .toISOString();
  return origDateFromUntil;
};

/**
 * Get current week and month date ranges
 * @returns Object containing week and month date ranges in YYYY-MM-DD format
 * @example
 * {
 *   week: { startDate: '2024-01-01', endDate: '2024-01-07' },
 *   month: { startDate: '2024-01-01', endDate: '2024-01-31' }
 * }
 */
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

/**
 * Check if two date strings are in the same month
 * @param start Start date string (ISO or other parseable format)
 * @param end End date string (ISO or other parseable format)
 * @returns true if both dates are in the same month
 */
export const isSameMonth = (start: string, end: string) => {
  const _start = dayjs(start);
  const _end = dayjs(end);

  const isSameMonth = _start.format("M") === _end.format("M");
  return isSameMonth;
};

/**
 * Convert date string to a supported RFC format (RFC5545, RFC3339, etc)
 * @param format - Which RFC format to output
 * @param orig - The original date string (ISO, RFC, etc)
 * @returns Date string in the target RFC format
 */
export const formatAs = (format: Key_Format, orig: string): string | null => {
  const iso = dayjs.utc(orig);
  if (!iso.isValid()) return null;
  return iso.format(FORMAT[format].value);
};

export const convertRfc5545ToIso = (orig: string) => {
  const untilParsed = dayjs.utc(orig, FORMAT.RFC5545.value);

  if (!untilParsed.isValid()) return null;

  return untilParsed.toISOString();
};

/**
 * Convert supported RFC date string (RFC5545, RFC3339, etc) to ISO string
 * @param orig - The original string in a supported RFC format
 * @returns Parsed date as ISO string (e.g., "2025-12-07T15:59:33.000Z")
 */
export const formatAsIso8601 = (orig: string) => {
  // Try native Date/ISO parse first
  const d = new Date(orig);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  // Try to normalize compact RFC5545 (YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ)
  const compactMatch = orig.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/,
  );
  if (compactMatch) {
    const [y, m, d, h, min, s, z] = compactMatch.slice(1);
    if (z) {
      // Z: treat as UTC
      const norm = `${y}-${m}-${d}T${h}:${min}:${s}Z`;
      const d2 = new Date(norm);
      if (!isNaN(d2.getTime())) {
        return d2.toISOString();
      }
    } else {
      // No Z: treat as UTC (not local!)
      const utcMs = Date.UTC(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(h),
        Number(min),
        Number(s),
      );
      return new Date(utcMs).toISOString();
    }
  }

  return null;
};

/**
 * Checks if two date ranges overlap.
 * Two ranges overlap if one starts before or on the day the other ends
 * AND ends after or on the day the other starts.
 *
 * @param rangeAStart - Start of first range (date string or Dayjs)
 * @param rangeAEnd - End of first range (date string or Dayjs)
 * @param rangeBStart - Start of second range (date string or Dayjs)
 * @param rangeBEnd - End of second range (date string or Dayjs)
 * @param granularity - "day" for day-level comparison, null for exact time
 * @returns true if the ranges overlap
 */
export const isDateRangeOverlapping = (
  rangeAStart: string | Dayjs,
  rangeAEnd: string | Dayjs,
  rangeBStart: string | Dayjs,
  rangeBEnd: string | Dayjs,
  granularity: "day" | null = null,
): boolean => {
  const aStart = dayjs(rangeAStart);
  const aEnd = dayjs(rangeAEnd);
  const bStart = dayjs(rangeBStart);
  const bEnd = dayjs(rangeBEnd);

  if (granularity === "day") {
    return (
      aStart.isSameOrBefore(bEnd, "day") && aEnd.isSameOrAfter(bStart, "day")
    );
  }
  return aStart.isSameOrBefore(bEnd) && aEnd.isSameOrAfter(bStart);
};
