import { type Dayjs } from "@core/util/date/dayjs";
import {
  getDayjsByTimeValue,
  getTimeOptionByValue,
  parseUserTime,
} from "@web/common/utils/datetime/web.date.util";

/** Longest sequence a typed time can be: HHMM. */
export const QUICK_TIME_MAX_DIGITS = 4;

const DIGITS_ONLY = /^\d{1,4}$/;

export const isQuickTimeDigit = (key: string) => /^\d$/.test(key);

/** False once the buffer is HHMM, which is when it can commit immediately. */
export const canQuickTimeBufferGrow = (digits: string) =>
  digits.length < QUICK_TIME_MAX_DIGITS;

/**
 * Resolve a typed digit sequence to a start time on `targetDay`.
 *
 * The 12-hour ambiguity ("1130" at 9am vs 9pm) is settled by `parseUserTime`'s
 * meridiem inheritance: passing `now` as its current value shifts an hour in
 * 1-12 into PM when now is PM, and leaves 13-23 ("1700") alone. Reusing it
 * keeps a typed time on the grid identical to the same digits typed into the
 * event form's time field, warts included - notably that "1200" typed in the
 * morning resolves to 12 AM, not noon (see quickTimeSequenceForHour, which
 * declines to advertise a sequence that would not land where its chip says).
 */
export function resolveQuickTimeStart(
  digits: string,
  now: Dayjs,
  targetDay: Dayjs,
): Dayjs | null {
  if (!DIGITS_ONLY.test(digits)) return null;

  const parsed = parseUserTime(digits, getTimeOptionByValue(now).value);
  if (!parsed) return null;

  const time = getDayjsByTimeValue(parsed.value);
  if (!time.isValid()) return null;

  return targetDay.startOf("day").hour(time.hour()).minute(time.minute());
}

/**
 * The sequence a slot chip advertises for `hour`, or null when no digits-only
 * sequence reaches that hour from `now`.
 *
 * Round-tripping the 24-hour form through `resolveQuickTimeStart` is what makes
 * that guarantee: in the evening, meridiem inheritance pulls "0900" to 9 PM, so
 * the morning slots (already past) simply get no chip rather than one that
 * lands somewhere else.
 */
export function quickTimeSequenceForHour(
  hour: number,
  now: Dayjs,
  targetDay: Dayjs,
): string | null {
  const sequence = `${String(hour).padStart(2, "0")}00`;
  const resolved = resolveQuickTimeStart(sequence, now, targetDay);

  return resolved?.hour() === hour ? sequence : null;
}

/**
 * The day a typed time lands on: today when the view contains it, else the
 * first day of the view. Mirrors createAlldayDraft's fallback so "create an
 * event" means the same day whichever gesture started it.
 */
export const quickTimeTargetDay = (
  startOfView: Dayjs,
  endOfView: Dayjs,
  now: Dayjs,
): Dayjs =>
  now.isBetween(startOfView, endOfView, "day", "[]")
    ? now.startOf("day")
    : startOfView.startOf("day");

export type QuickTimeSlot = {
  /** Offset-formatted, so getBusyPeriodPosition can place it like any segment. */
  start: string;
  end: string;
  /** Digits the chip advertises, and that create this slot when typed. */
  sequence: string;
};

/**
 * One placeholder per open hour of `targetDay`: hours already covered by an
 * event are dropped so chips never pile onto a card, and hours with no
 * reachable sequence are dropped by quickTimeSequenceForHour.
 */
export function buildQuickTimeSlots({
  busy,
  now,
  targetDay,
}: {
  busy: readonly { startMs: number; endMs: number }[];
  now: Dayjs;
  targetDay: Dayjs;
}): QuickTimeSlot[] {
  const day = targetDay.startOf("day");
  const slots: QuickTimeSlot[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const sequence = quickTimeSequenceForHour(hour, now, day);
    if (!sequence) continue;

    const start = day.hour(hour);
    const end = start.add(1, "hour");
    const startMs = start.valueOf();
    const endMs = end.valueOf();
    const isTaken = busy.some(
      (period) => period.startMs < endMs && period.endMs > startMs,
    );
    if (isTaken) continue;

    slots.push({ start: start.format(), end: end.format(), sequence });
  }

  return slots;
}
