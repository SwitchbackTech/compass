import { useMemo } from "react";
import type dayjs from "@core/util/date/dayjs";
import { dayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useDayEventsQuery } from "@web/events/queries/useDayEventsQuery";
import { usePrefetchAdjacentEvents } from "@web/events/queries/usePrefetchAdjacentEvents";

const dayRange = (date: dayjs.Dayjs) => ({
  startDate: date.startOf("day").utc(true).format(),
  endDate: date.endOf("day").utc(true).format(),
});

export function useDayEvents(dateInView: dayjs.Dayjs) {
  const { startDateUtc, endDateUtc } = useMemo(
    () => ({
      startDateUtc: dateInView.startOf("day").utc(true).format(),
      endDateUtc: dateInView.endOf("day").utc(true).format(),
    }),
    [dateInView],
  );

  useDayEventsQuery({ startDate: startDateUtc, endDate: endDateUtc });

  // Warm the previous/next day so the next prev/next click resolves from
  // cache. Uses the same start/end-of-day UTC formatting as the read above,
  // so the prefetched entries land under the exact keys a subsequent read
  // looks up.
  const previous = useMemo(
    () => dayRange(dateInView.subtract(1, "day")),
    [dateInView],
  );
  const next = useMemo(() => dayRange(dateInView.add(1, "day")), [dateInView]);
  usePrefetchAdjacentEvents(dayEventsQueryOptions, previous, next);
}
