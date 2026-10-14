import { HOURS_AM_SHORT_FORMAT } from "@core/constants/date.constants";
import { civilHourSlotCount, startOfCivilDay } from "@core/util/date/civil-day";
import type dayjs from "@core/util/date/dayjs";

function formatMappedHourLabel(date: dayjs.Dayjs): string {
  return date.minute() === 0
    ? date.format(HOURS_AM_SHORT_FORMAT)
    : date.format("h:mm A");
}

/**
 * Wall-clock hour labels for `displayTimeZone` at each effective-zone hour
 * line (1 AM through 11 PM). Offset is computed per instant so DST gaps
 * between the two zones stay aligned with the grid.
 */
export function mappedHourLabels(
  effectiveTimeZone: string,
  displayTimeZone: string,
  at: Date | string,
): string[] {
  const labelCount = Math.max(0, civilHourSlotCount(at, effectiveTimeZone) - 1);
  const day = startOfCivilDay(at, effectiveTimeZone);
  return Array.from({ length: labelCount }, (_, index) =>
    formatMappedHourLabel(day.add(index + 1, "hour").tz(displayTimeZone)),
  );
}
