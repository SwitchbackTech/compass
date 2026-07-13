import { useMemo } from "react";
import type dayjs from "@core/util/date/dayjs";
import { dayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useDayEventsQuery } from "@web/events/queries/useDayEventsQuery";
import { usePrefetchAdjacentEvents } from "@web/events/queries/usePrefetchAdjacentEvents";

/**
 * A day's event query range as `[startDate, endDate)`: `endDate` is the next
 * calendar day's start, not this day's end, so all-day events spanning only
 * this single day still fall within the range's exclusive upper bound.
 */
export const dayEventQueryRange = (date: dayjs.Dayjs) => ({
  startDate: date.startOf("day").utc(true).format(),
  endDate: date.add(1, "day").startOf("day").utc(true).format(),
});

export function useDayEvents(dateInView: dayjs.Dayjs) {
  const { startDate, endDate } = useMemo(
    () => dayEventQueryRange(dateInView),
    [dateInView],
  );

  useDayEventsQuery({ startDate, endDate });

  // Warm the previous/next day so the next prev/next click resolves from
  // cache. Uses the same start/end-of-day UTC formatting as the read above,
  // so the prefetched entries land under the exact keys a subsequent read
  // looks up.
  const previous = useMemo(
    () => dayEventQueryRange(dateInView.subtract(1, "day")),
    [dateInView],
  );
  const next = useMemo(
    () => dayEventQueryRange(dateInView.add(1, "day")),
    [dateInView],
  );
  usePrefetchAdjacentEvents(dayEventsQueryOptions, previous, next);
}
