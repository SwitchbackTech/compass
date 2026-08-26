import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { toUTCOffset } from "@web/common/utils/datetime/web.date.util";
import { weekEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import {
  availabilityActions,
  useAvailabilityStore,
} from "./availability.store";
import {
  type AvailabilityConflict,
  generateAvailabilitySlots,
  selectDefaultAvailabilitySlots,
} from "./availability-slot.util";

export function useAvailabilityEvents(start: Dayjs, end: Dayjs) {
  const isOpen = useAvailabilityStore((state) => state.isOpen);
  const sourceZone = useAvailabilityStore((state) => state.sourceZone);
  const source = useEventRepositorySource();
  const calendars = useCalendarsQuery();
  const calendarIds = useMemo(
    () =>
      calendars.data?.filter(({ isActive }) => isActive).map(({ id }) => id),
    [calendars.data],
  );
  const query = useQuery({
    ...weekEventsQueryOptions({
      source,
      startDate: toUTCOffset(start.startOf("day")),
      endDate: toUTCOffset(end.add(1, "day").startOf("day")),
      calendarIds,
    }),
    enabled: isOpen && calendars.isSuccess,
  });
  useEffect(() => {
    if (!isOpen || !query.data) return;
    const conflicts = query.data.ids.reduce<AvailabilityConflict[]>(
      (result, id) => {
        const event = query.data?.entities[id];
        if (!event) return result;
        if (event.schedule.kind === "allDay") {
          result.push({ date: event.schedule.start, allDay: true });
        } else {
          result.push({ start: event.schedule.start, end: event.schedule.end });
        }
        return result;
      },
      [],
    );
    const generated = generateAvailabilitySlots({
      rangeStart: start.toDate(),
      rangeEnd: end.add(1, "day").startOf("day").toDate(),
      now: new Date(),
      timeZone: sourceZone,
      conflicts,
    });
    availabilityActions.setSlots(
      selectDefaultAvailabilitySlots(generated, sourceZone),
    );
  }, [end, isOpen, query.data, sourceZone, start]);
  return query;
}
