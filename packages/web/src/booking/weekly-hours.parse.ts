import {
  type LocalTimeOfDay,
  localTimeToMinutes,
} from "@core/types/booking.contracts";
import {
  getDayjsByTimeValue,
  parseUserTime,
} from "@web/common/utils/datetime/web.date.util";

export interface ParsedHoursRange {
  start: LocalTimeOfDay;
  end: LocalTimeOfDay;
}

export type ParseHoursResult =
  | { ok: true; ranges: ParsedHoursRange[] }
  | { ok: false; error: string };

const RANGE_SEPARATOR = /\s*(?:-|–|—|\bto\b)\s*/i;
const LIST_SEPARATOR = /[,;]/;
const EXPLICIT_MERIDIEM = /[ap]\.?m?\.?\s*$/i;

const toLocalTime = (value: string): LocalTimeOfDay =>
  getDayjsByTimeValue(value).format("HH:mm") as LocalTimeOfDay;

const minutesOf = localTimeToMinutes;

/** Push a bare 1-11 o'clock into the afternoon. */
const toPm = (time: LocalTimeOfDay): LocalTimeOfDay => {
  const [hoursText, minutes] = time.split(":");
  return `${String(Number(hoursText) + 12).padStart(2, "0")}:${minutes}` as LocalTimeOfDay;
};

const canShiftToPm = (time: LocalTimeOfDay, raw: string): boolean => {
  if (EXPLICIT_MERIDIEM.test(raw.trim())) return false;
  const hour = Number(time.split(":")[0]);
  return hour >= 1 && hour <= 11;
};

/**
 * Parse one "9-5" style range.
 *
 * `parseUserTime`'s meridiem inheritance is deliberately NOT used to settle the
 * end side: passing a 9 AM start as its current value resolves a bare "5" to
 * 5 AM, which the contract rejects (end must be after start). A bare 1-11
 * o'clock that lands at or before the start is pushed to PM instead, which is
 * what "9-5" means to everyone who types it. `afterMinutes` extends the same
 * courtesy to a later segment, so "1" after a noon break is 1 PM.
 */
const parseRange = (
  text: string,
  afterMinutes: number | null,
): ParsedHoursRange | null => {
  const [rawStart, rawEnd, ...rest] = text.split(RANGE_SEPARATOR);
  if (rest.length > 0 || !rawStart || !rawEnd) return null;

  const startOption = parseUserTime(rawStart.trim());
  const endOption = parseUserTime(rawEnd.trim());
  if (!startOption || !endOption) return null;

  let start = toLocalTime(startOption.value);
  let end = toLocalTime(endOption.value);

  // A later segment continues the day, so a bare "1" after a noon break is
  // 1 PM, not 1 AM.
  if (
    afterMinutes !== null &&
    minutesOf(start) <= afterMinutes &&
    canShiftToPm(start, rawStart)
  ) {
    start = toPm(start);
  }

  if (minutesOf(end) <= minutesOf(start) && canShiftToPm(end, rawEnd)) {
    end = toPm(end);
  }

  if (minutesOf(end) <= minutesOf(start)) return null;
  return { start, end };
};

const overlaps = (a: ParsedHoursRange, b: ParsedHoursRange): boolean =>
  minutesOf(a.start) < minutesOf(b.end) &&
  minutesOf(b.start) < minutesOf(a.end);

/**
 * Parse a day's hours: blank means unavailable, and a comma-separated list
 * means several intervals ("9-12, 1-5"). The contract has always allowed
 * multiple non-overlapping intervals per weekday; the old checkbox-plus-two-
 * time-inputs editor could only ever show the first and dropped the rest on
 * the next save.
 */
export function parseHoursRanges(input: string): ParseHoursResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: true, ranges: [] };

  const parts = trimmed
    .split(LIST_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part !== "");

  const ranges: ParsedHoursRange[] = [];
  for (const part of parts) {
    const previous = ranges[ranges.length - 1];
    // Fall back to reading the segment on its own terms when continuing the
    // previous one yields nothing: "9-12, 11-2" is an overlap the user should
    // hear about, not an unreadable segment.
    const range =
      parseRange(part, previous ? minutesOf(previous.end) : null) ??
      parseRange(part, null);
    if (!range) {
      return { ok: false, error: `Could not read "${part}". Try 9-5.` };
    }
    if (ranges.some((existing) => overlaps(existing, range))) {
      return { ok: false, error: "Those hours overlap each other." };
    }
    ranges.push(range);
  }

  return { ok: true, ranges };
}

const to12Hour = (time: LocalTimeOfDay): string => {
  const [hoursText, minutes] = time.split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === "00"
    ? `${hour12}${suffix}`
    : `${hour12}:${minutes}${suffix}`;
};

/** Render stored intervals back into the compact form the field accepts. */
export function formatHoursRanges(ranges: readonly ParsedHoursRange[]): string {
  return ranges
    .map((range) => `${to12Hour(range.start)}-${to12Hour(range.end)}`)
    .join(", ");
}
