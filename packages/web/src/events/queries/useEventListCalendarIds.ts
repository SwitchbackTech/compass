import { useMemo } from "react";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { deriveEventListCalendarIds } from "./derive-event-list-calendar-ids";

/** Visible active calendar ids for event list reads / prefetch keys. */
export function useEventListCalendarIds() {
  const { data: calendars } = useCalendarsQuery();
  return useMemo(() => deriveEventListCalendarIds(calendars), [calendars]);
}
