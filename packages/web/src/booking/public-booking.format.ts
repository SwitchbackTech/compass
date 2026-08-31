import {
  type BookingSlotsQuery,
  BookingSlotsQuerySchema,
} from "@core/types/booking.contracts";
import dayjs from "@core/util/date/dayjs";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";

const SLOT_WINDOW_DAYS = 14;

export function getPublicBookingSlotWindow(
  hostTimeZone: string,
  maxHorizonDays: number,
): BookingSlotsQuery {
  const guestTimeZone = getBrowserTimeZone();
  const start = dayjs().tz(guestTimeZone).startOf("minute");
  const preferredEnd = dayjs()
    .tz(guestTimeZone)
    .add(SLOT_WINDOW_DAYS, "day")
    .endOf("day");
  // Match the slot engine: horizon is now + maxHorizonDays, not end-of-day.
  const horizonEnd = dayjs().add(maxHorizonDays, "day");
  const end = preferredEnd.isAfter(horizonEnd) ? horizonEnd : preferredEnd;

  return BookingSlotsQuerySchema.parse({
    start: start.toISOString(),
    end: end.toISOString(),
    timeZone: guestTimeZone || hostTimeZone,
  });
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
