import dayjs, { type Dayjs } from "@core/util/date/dayjs";

/** Midnight at the start of `day` in `timeZone` (calendar date from `day`). */
export function startOfCivilDay(
  day: Dayjs | Date | string,
  timeZone: string,
): Dayjs {
  const key = dayjs(day).format("YYYY-MM-DD");
  return dayjs.tz(key, timeZone).startOf("day");
}

/** Minutes from civil midnight to the next civil midnight (1380, 1440, or 1500). */
export function civilDayLengthMinutes(
  day: Dayjs | Date | string,
  timeZone: string,
): number {
  const start = startOfCivilDay(day, timeZone);
  const nextKey = start.add(1, "day").format("YYYY-MM-DD");
  const nextMidnight = dayjs.tz(nextKey, timeZone).startOf("day");
  return nextMidnight.diff(start, "minute");
}

/** Hour-sized slots in a civil day (23 on spring-forward, 25 on fall-back). */
export function civilHourSlotCount(
  day: Dayjs | Date | string,
  timeZone: string,
): number {
  return civilDayLengthMinutes(day, timeZone) / 60;
}

/** Minutes from civil midnight for `instant` in `timeZone`. */
export function minutesFromCivilMidnight(
  instant: Dayjs | Date | string,
  timeZone: string,
): number {
  const zoned = dayjs(instant).tz(timeZone);
  return zoned.diff(startOfCivilDay(zoned, timeZone), "minute");
}

/**
 * Hour-line instants after civil midnight (1 AM through 11 PM, plus the next
 * midnight when `includeMidnight` is true). Slot count follows DST.
 */
export function civilHourLineInstants(
  day: Dayjs | Date | string,
  timeZone: string,
  includeMidnight = false,
): Dayjs[] {
  const slotCount = civilHourSlotCount(day, timeZone);
  const hours = includeMidnight ? slotCount : Math.max(0, slotCount - 1);
  const start = startOfCivilDay(day, timeZone);
  return Array.from({ length: hours }, (_, index) =>
    start.add(index + 1, "hour"),
  );
}

/** RFC3339 string for an instant in `timeZone` (dayjs default format). */
export function formatInstantInTimeZone(
  iso: string | Date,
  timeZone: string,
): string {
  return dayjs(iso).tz(timeZone).format();
}
