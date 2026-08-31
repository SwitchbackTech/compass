import {
  type BookingSlotsQuery,
  BookingSlotsQuerySchema,
} from "@core/types/booking.contracts";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

export function formatBookingMonthKey(
  instant: Date | string | Dayjs,
  timeZone: string,
): string {
  return dayjs(instant).tz(timeZone).format("YYYY-MM");
}

export function shiftBookingMonthKey(
  monthKey: string,
  delta: number,
  timeZone: string,
): string {
  const monthStart = parseBookingMonthStart(monthKey, timeZone);
  if (!monthStart) {
    return monthKey;
  }
  return monthStart.add(delta, "month").format("YYYY-MM");
}

export function formatBookingMonthHeading(
  monthKey: string,
  timeZone: string,
): string {
  const monthStart = parseBookingMonthStart(monthKey, timeZone);
  if (!monthStart) {
    return monthKey;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone,
  }).format(monthStart.toDate());
}

function parseBookingMonthStart(
  monthKey: string,
  timeZone: string,
): Dayjs | null {
  if (!MONTH_KEY_PATTERN.test(monthKey)) {
    return null;
  }
  const monthStart = dayjs.tz(`${monthKey}-01`, timeZone).startOf("month");
  return monthStart.isValid() ? monthStart : null;
}

/**
 * Day-rounded window for one guest-timezone month, clamped to
 * `[today, now + maxHorizonDays]`. Null when the month is entirely in the
 * past or past the host horizon.
 */
export function getPublicBookingMonthWindow(
  monthKey: string,
  timeZone: string,
  maxHorizonDays: number,
  now: Dayjs = dayjs(),
): BookingSlotsQuery | null {
  const monthStart = parseBookingMonthStart(monthKey, timeZone);
  if (!monthStart) {
    return null;
  }

  const todayStart = now.tz(timeZone).startOf("day");
  const nextMonthStart = monthStart.add(1, "month").startOf("month");
  const horizonEnd = now.add(maxHorizonDays, "day");
  const start = monthStart.isBefore(todayStart) ? todayStart : monthStart;
  const end = nextMonthStart.isAfter(horizonEnd) ? horizonEnd : nextMonthStart;

  if (!end.isAfter(start)) {
    return null;
  }

  return BookingSlotsQuerySchema.parse({
    start: start.toISOString(),
    end: end.toISOString(),
    timeZone,
  });
}

export function isBookingMonthAvailable(
  monthKey: string,
  timeZone: string,
  maxHorizonDays: number,
  now: Dayjs = dayjs(),
): boolean {
  return (
    getPublicBookingMonthWindow(monthKey, timeZone, maxHorizonDays, now) != null
  );
}

export function formatGuestTimeZoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "long",
    }).formatToParts(new Date());
    const name = parts.find((part) => part.type === "timeZoneName")?.value;
    return name ?? timeZone;
  } catch {
    return timeZone;
  }
}

export function formatBookingSlotLabel(
  slotStart: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slotStart));
}

export function formatBookingSlotTime(
  slotStart: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slotStart));
}

export function formatBookingSlotDateHeading(
  slotStart: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(slotStart));
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes === 60) {
    return "1 hour";
  }
  return `${minutes} minutes`;
}

/**
 * The one YYYY-MM-DD-in-a-timezone key. Slot starts used to go through a
 * separate `Intl` "en-CA" formatter, which is a second way to be right about
 * the same thing, and so a second thing to keep right.
 */
export function formatBookingDateKey(
  instant: Date | string | Dayjs,
  timeZone: string,
): string {
  return dayjs(instant).tz(timeZone).format("YYYY-MM-DD");
}

export function collectBookingAvailableDateKeys(
  slots: readonly { slotStart: string }[],
  timeZone: string,
): Set<string> {
  const keys = new Set<string>();
  for (const slot of slots) {
    keys.add(formatBookingDateKey(slot.slotStart, timeZone));
  }
  return keys;
}

export interface BookingMonthDayCell {
  dateKey: string;
  dayOfMonth: number;
  available: boolean;
  isToday: boolean;
}

export type BookingMonthGridCell =
  | { kind: "pad" }
  | { kind: "day"; day: BookingMonthDayCell };

export function listBookingMonthGridWeeks(
  monthKey: string,
  timeZone: string,
  availableDateKeys: ReadonlySet<string>,
  todayKey: string,
): BookingMonthGridCell[][] {
  const monthStart = parseBookingMonthStart(monthKey, timeZone);
  if (!monthStart) {
    return [];
  }

  const cells: BookingMonthGridCell[] = [];
  for (let pad = 0; pad < monthStart.day(); pad += 1) {
    cells.push({ kind: "pad" });
  }

  const daysInMonth = monthStart.daysInMonth();
  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth += 1) {
    const dateKey = monthStart.date(dayOfMonth).format("YYYY-MM-DD");
    cells.push({
      kind: "day",
      day: {
        dateKey,
        dayOfMonth,
        available: dateKey >= todayKey && availableDateKeys.has(dateKey),
        isToday: dateKey === todayKey,
      },
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: "pad" });
  }

  const weeks: BookingMonthGridCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function listBookingAvailableDayKeys(
  weeks: readonly (readonly BookingMonthGridCell[])[],
): string[] {
  const keys: string[] = [];
  for (const week of weeks) {
    for (const cell of week) {
      if (cell.kind === "day" && cell.day.available) {
        keys.push(cell.day.dateKey);
      }
    }
  }
  return keys;
}

export function stepBookingAvailableDay(
  dateKey: string,
  availableDateKeys: readonly string[],
  timeZone: string,
  direction: "previous" | "next" | "previousWeek" | "nextWeek",
): string {
  if (availableDateKeys.length === 0) {
    return dateKey;
  }
  const currentIndex = availableDateKeys.indexOf(dateKey);
  if (currentIndex < 0) {
    return availableDateKeys[0] ?? dateKey;
  }
  if (direction === "previous") {
    return availableDateKeys[Math.max(0, currentIndex - 1)] ?? dateKey;
  }
  if (direction === "next") {
    return (
      availableDateKeys[
        Math.min(availableDateKeys.length - 1, currentIndex + 1)
      ] ?? dateKey
    );
  }

  const weekday = dayjs.tz(dateKey, timeZone).day();
  const sameWeekday = availableDateKeys.filter(
    (key) => dayjs.tz(key, timeZone).day() === weekday,
  );
  const weekdayIndex = sameWeekday.indexOf(dateKey);
  if (weekdayIndex < 0) {
    return dateKey;
  }
  if (direction === "previousWeek") {
    return sameWeekday[Math.max(0, weekdayIndex - 1)] ?? dateKey;
  }
  return (
    sameWeekday[Math.min(sameWeekday.length - 1, weekdayIndex + 1)] ?? dateKey
  );
}

export function listBookingWeekdayHeadings(
  timeZone: string,
): Array<{ short: string; long: string }> {
  const sunday = dayjs.tz("2026-08-02", timeZone);
  return Array.from({ length: 7 }, (_, index) => {
    const date = sunday.add(index, "day").toDate();
    return {
      short: new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        timeZone,
      }).format(date),
      long: new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        timeZone,
      }).format(date),
    };
  });
}

export function formatBookingMonthDayLabel(
  dateKey: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(dayjs.tz(dateKey, timeZone).toDate());
}

export function listBookingAvailableDateKeysInMonth(
  slots: readonly { slotStart: string }[],
  monthKey: string,
  timeZone: string,
  todayKey: string,
): string[] {
  return listBookingAvailableDayKeys(
    listBookingMonthGridWeeks(
      monthKey,
      timeZone,
      collectBookingAvailableDateKeys(slots, timeZone),
      todayKey,
    ),
  );
}

export function findNextAvailableBookingDate(
  monthKey: string,
  afterDateKey: string | null,
  slotsByMonth: ReadonlyMap<
    string,
    readonly { slotStart: string }[] | undefined
  >,
  timeZone: string,
  todayKey: string,
  maxHorizonDays: number,
  now?: Dayjs,
): { monthKey: string; dateKey: string | null } | null {
  let month = monthKey;
  let after = afterDateKey;
  for (let step = 0; step < 14; step += 1) {
    if (!isBookingMonthAvailable(month, timeZone, maxHorizonDays, now)) {
      return null;
    }
    if (!slotsByMonth.has(month)) {
      return { monthKey: month, dateKey: null };
    }
    const days = listBookingAvailableDateKeysInMonth(
      slotsByMonth.get(month) ?? [],
      month,
      timeZone,
      todayKey,
    );
    const afterKey = after;
    const next =
      afterKey == null ? days[0] : days.find((dateKey) => dateKey > afterKey);
    if (next) {
      return { monthKey: month, dateKey: next };
    }
    month = shiftBookingMonthKey(month, 1, timeZone);
    after = null;
  }
  return null;
}
