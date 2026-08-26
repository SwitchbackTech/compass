import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
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
  const rangeKey = `${start.format("YYYY-MM-DD")}/${end.format("YYYY-MM-DD")}`;
  const previousRange = useRef(rangeKey);
  useEffect(() => {
    if (
      previousRange.current !== rangeKey &&
      useAvailabilityStore.getState().isOpen
    )
      availabilityActions.close();
    previousRange.current = rangeKey;
  }, [rangeKey]);
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
    if (!isOpen) return;
    if (query.isPending) availabilityActions.setStatus("loading");
    if (query.isError) availabilityActions.setStatus("error");
    if (!query.data) return;
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
    const existing = useAvailabilityStore.getState().slots;
    if (!existing.length) {
      availabilityActions.setSlots(
        selectDefaultAvailabilitySlots(generated, sourceZone),
      );
      return;
    }
    const generatedIds = new Set(generated.map(({ id }) => id));
    const removedSelected = existing.some(
      (slot) => slot.selected && !generatedIds.has(slot.id),
    );
    const selectedIds = new Set(
      existing.filter(({ selected }) => selected).map(({ id }) => id),
    );
    availabilityActions.setSlots(
      generated.map((slot) => ({
        ...slot,
        selected: selectedIds.has(slot.id),
        origin: selectedIds.has(slot.id) ? "user" : slot.origin,
      })),
    );
    if (removedSelected)
      availabilityActions.announce(
        "A selected time was removed because it is no longer free.",
      );
  }, [
    end,
    isOpen,
    query.data,
    query.isError,
    query.isPending,
    sourceZone,
    start,
  ]);
  return query;
}
