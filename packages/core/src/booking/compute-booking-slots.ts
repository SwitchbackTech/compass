import {
  type BookingDurationMinutes,
  type WeeklyAvailability,
} from "@core/types/booking.contracts";
import dayjs from "@core/util/date/dayjs";

const SLOT_GRID_MINUTES = 15;

/** Half-open [start, end) busy interval on the UTC instant axis. */
export interface BookingBusyInterval {
  start: Date;
  end: Date;
}

export interface ComputeBookingSlotsInput {
  timeZone: string;
  durationMinutes: BookingDurationMinutes;
  weeklyAvailability: WeeklyAvailability;
  minNoticeHours: number;
  maxHorizonDays: number;
  bufferMinutes: number | null;
  maxBookingsPerDay: number | null;
  busyIntervals: readonly BookingBusyInterval[];
  confirmedReservationStarts: readonly Date[];
  now: Date;
  windowStart: Date;
  windowEnd: Date;
}

// Matches packages/sync/src/domain/busy-query.service.ts mergeBusyIntervals:
// half-open [start, end), overlapping and touching intervals merge.
export const mergeBookingBusyIntervals = (
  intervals: readonly BookingBusyInterval[],
): BookingBusyInterval[] => {
  const sorted = intervals
    .filter((interval) => interval.end.getTime() > interval.start.getTime())
    .sort(
      (left, right) =>
        left.start.getTime() - right.start.getTime() ||
        left.end.getTime() - right.end.getTime(),
    );

  const merged: BookingBusyInterval[] = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }
  return merged;
};

const localTimeToMinutes = (time: string): number => {
  const [hoursText, minutesText] = time.split(":");
  return Number(hoursText) * 60 + Number(minutesText);
};

const toIsoWeekday = (localDay: dayjs.Dayjs): number => {
  const day = localDay.day();
  return day === 0 ? 7 : day;
};

const slotOverlapsBlockedInterval = (
  slotStart: Date,
  slotEnd: Date,
  blockedStart: Date,
  blockedEnd: Date,
  bufferMinutes: number,
): boolean => {
  if (bufferMinutes <= 0) {
    return (
      slotStart.getTime() < blockedEnd.getTime() &&
      slotEnd.getTime() > blockedStart.getTime()
    );
  }

  const bufferMs = bufferMinutes * 60_000;
  const expandedStart = blockedStart.getTime() - bufferMs;
  const expandedEnd = blockedEnd.getTime() + bufferMs;
  return slotStart.getTime() < expandedEnd && slotEnd.getTime() > expandedStart;
};

const isSlotBlocked = (
  slotStart: Date,
  slotEnd: Date,
  blockedIntervals: readonly BookingBusyInterval[],
  bufferMinutes: number,
): boolean =>
  blockedIntervals.some((interval) =>
    slotOverlapsBlockedInterval(
      slotStart,
      slotEnd,
      interval.start,
      interval.end,
      bufferMinutes,
    ),
  );

const localDateKey = (instant: Date, timeZone: string): string =>
  dayjs(instant).tz(timeZone).format("YYYY-MM-DD");

/**
 * Reservations tallied by their local date, in one pass. The day loop below
 * would otherwise re-scan every reservation - and pay a timezone conversion
 * for each - once per day in the window.
 */
const countReservationsByLocalDate = (
  reservationStarts: readonly Date[],
  timeZone: string,
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const start of reservationStarts) {
    const localDate = localDateKey(start, timeZone);
    counts.set(localDate, (counts.get(localDate) ?? 0) + 1);
  }
  return counts;
};

const availabilityForWeekday = (
  weeklyAvailability: WeeklyAvailability,
  weekday: number,
) => weeklyAvailability.filter((interval) => interval.weekday === weekday);

/**
 * Pure slot engine: weekly hours, busy/reservation buffers, min notice,
 * horizon, and max-per-day caps. Returns UTC instants valid as slot starts.
 */
export const computeBookingSlots = (
  input: ComputeBookingSlotsInput,
): string[] => {
  const {
    timeZone,
    durationMinutes,
    weeklyAvailability,
    minNoticeHours,
    maxHorizonDays,
    bufferMinutes,
    maxBookingsPerDay,
    busyIntervals,
    confirmedReservationStarts,
    now,
    windowStart,
    windowEnd,
  } = input;

  if (weeklyAvailability.length === 0) {
    return [];
  }

  const durationMs = durationMinutes * 60_000;
  const minNoticeMs = minNoticeHours * 60 * 60_000;
  const horizonEnd = dayjs(now).add(maxHorizonDays, "day").toDate();
  const buffer = bufferMinutes ?? 0;

  const reservationIntervals: BookingBusyInterval[] =
    confirmedReservationStarts.map((start) => ({
      start,
      end: new Date(start.getTime() + durationMs),
    }));

  const blockedIntervals = mergeBookingBusyIntervals([
    ...busyIntervals,
    ...reservationIntervals,
  ]);

  const reservationsPerLocalDate =
    maxBookingsPerDay === null
      ? null
      : countReservationsByLocalDate(confirmedReservationStarts, timeZone);

  const slots: string[] = [];
  const seenStarts = new Set<number>();

  let dayCursor = dayjs(windowStart).tz(timeZone).startOf("day");
  const lastDay = dayjs(windowEnd).tz(timeZone).startOf("day");

  while (dayCursor.isSameOrBefore(lastDay, "day")) {
    const weekday = toIsoWeekday(dayCursor);
    const dayAvailability = availabilityForWeekday(weeklyAvailability, weekday);
    const localDate = dayCursor.format("YYYY-MM-DD");

    if (
      maxBookingsPerDay !== null &&
      (reservationsPerLocalDate?.get(localDate) ?? 0) >= maxBookingsPerDay
    ) {
      dayCursor = dayCursor.add(1, "day");
      continue;
    }

    for (const interval of dayAvailability) {
      const intervalStartMinutes = localTimeToMinutes(interval.start);
      const intervalEndMinutes = localTimeToMinutes(interval.end);
      let minuteCursor = intervalStartMinutes;

      while (minuteCursor + durationMinutes <= intervalEndMinutes) {
        const hours = Math.floor(minuteCursor / 60);
        const minutes = minuteCursor % 60;
        const localStart = dayjs.tz(
          `${localDate} ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
          "YYYY-MM-DD HH:mm",
          timeZone,
        );

        if (!localStart.isValid()) {
          minuteCursor += SLOT_GRID_MINUTES;
          continue;
        }

        const slotStart = localStart.toDate();
        const slotEnd = new Date(slotStart.getTime() + durationMs);
        const slotStartMs = slotStart.getTime();

        if (
          slotStartMs >= windowStart.getTime() &&
          slotStartMs < windowEnd.getTime() &&
          slotStartMs >= now.getTime() + minNoticeMs &&
          slotStartMs < horizonEnd.getTime() &&
          !isSlotBlocked(slotStart, slotEnd, blockedIntervals, buffer) &&
          !seenStarts.has(slotStartMs)
        ) {
          seenStarts.add(slotStartMs);
          slots.push(localStart.utc().format());
        }

        minuteCursor += SLOT_GRID_MINUTES;
      }
    }

    dayCursor = dayCursor.add(1, "day");
  }

  slots.sort();
  return slots;
};
