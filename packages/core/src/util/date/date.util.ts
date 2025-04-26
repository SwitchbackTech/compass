import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import utc from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";

dayjs.extend(utc);
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat); // for RFC formatting

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
 * Appends a RFC5545 timestamp to a base ID
 * @param base The base ID to append to
 * @param start The start date of the event
 * @returns The base ID with the RFC5545 timestamp appended
 */
export const appendWithRfc5545Timestamp = (base: string, start: string) => {
  const timestamp = formatAs("RFC5545", start);
  return `${base}_${timestamp}`;
};

/**
 * Convert a recurrence rule with UNTIL value to  date
 * @param rrule The full recurrence rule with UNTIL value (e.g. "RRULE:FREQ=DAILY;UNTIL=20260108T005808Z")
 * @returns The UNTIL value, parsed as iso8601 (e.g. '2026-01-08T00:58:08.000Z')
 */
export const convertRruleWithUntilToDate = (rrule: string) => {
  const origDateFromUntil = dayjs
    .utc(rrule, FORMAT.RFC5545.value)
    .toISOString();
  return origDateFromUntil;
};

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
    const [_, y, m, d, h, min, s, z] = compactMatch;
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
