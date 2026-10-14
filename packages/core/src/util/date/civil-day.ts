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
 * RFC3339 offset string for an absolute instant in `timeZone`, with the
 * offset that applies on that civil date (handles stale offsets in `iso`).
 */
export function formatInstantInTimeZone(
  iso: string | Date,
  timeZone: string,
): string {
  return dayjs(iso).tz(timeZone).format();
}
