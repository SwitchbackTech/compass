import { useMemo } from "react";
import type dayjs from "@core/util/date/dayjs";
import { useDayEventsQuery } from "@web/ducks/events/queries/useDayEventsQuery";

export function useDayEvents(dateInView: dayjs.Dayjs) {
  const { startDateUtc, endDateUtc } = useMemo(() => {
    return {
      startDateUtc: dateInView.startOf("day").utc(true).format(),
      endDateUtc: dateInView.endOf("day").utc(true).format(),
    };
  }, [dateInView]);

  useDayEventsQuery({ startDate: startDateUtc, endDate: endDateUtc });
}
