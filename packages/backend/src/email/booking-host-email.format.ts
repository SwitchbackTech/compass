import dayjs from "@core/util/date/dayjs";

const MEETING_WHEN_FORMAT = "ddd, MMM D, h:mm A";

export function formatBookingEmailWhen(
  instant: Date,
  timeZone: string,
): string {
  return `${dayjs(instant).tz(timeZone).format(MEETING_WHEN_FORMAT)} (${timeZone})`;
}

export function formatBookingEmailSlotRange(
  slotStart: Date,
  slotEnd: Date,
  timeZone: string,
): string {
  const start = dayjs(slotStart).tz(timeZone);
  const end = dayjs(slotEnd).tz(timeZone);
  const sameDay = start.format("YYYY-MM-DD") === end.format("YYYY-MM-DD");
  const startText = start.format(MEETING_WHEN_FORMAT);
  const endText = sameDay
    ? end.format("h:mm A")
    : end.format(MEETING_WHEN_FORMAT);
  return `${startText} – ${endText} (${timeZone})`;
}

export function weekDateKeyForInstant(instant: Date, timeZone: string): string {
  return dayjs(instant).tz(timeZone).format("YYYY-MM-DD");
}
