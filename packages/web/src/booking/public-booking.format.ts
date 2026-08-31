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

export function formatBookingSlotDateKey(
  slotStart: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

export function groupSlotsByGuestDate<T extends { slotStart: string }>(
  slots: readonly T[],
  timeZone: string,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const slot of slots) {
    const key = formatBookingSlotDateKey(slot.slotStart, timeZone);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(slot);
    } else {
      grouped.set(key, [slot]);
    }
  }
  return grouped;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes === 60) {
    return "1 hour";
  }
  return `${minutes} minutes`;
}
