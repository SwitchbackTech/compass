import { type Event } from "@core/types/event.contracts";
import { type NormalizedEvents } from "@web/events/event-view.types";

/**
 * Normalize a list of events into the `{ ids, entities }` shape the query
 * caches store, keyed by `id`. Duplicate ids resolve last-write-wins in
 * `entities`.
 */
export const normalizeEventList = (events: Event[]): NormalizedEvents => ({
  ids: events.map((event) => event.id),
  entities: events.reduce<NormalizedEvents["entities"]>((entities, event) => {
    entities[event.id] = event;
    return entities;
  }, {}),
});

/**
 * Single source of truth for "does this event belong in this [start, end)
 * instant range". Shared by the read/normalize pipeline and the mutation
 * optimistic-insert logic so reads and optimistic writes agree on membership.
 * Mirrors the backend's own overlap semantics exactly (event.repository.ts
 * range branches): timed events overlap by instant, all-day events overlap by
 * the calendar-date slice of the query's own start/end instants — see
 * LocalEventRepository/indexeddb-offline-data.store.ts `getEvents`, which
 * implements the identical filter for local/offline mode.
 */
export const eventMatchesRange = (
  event: Event,
  start?: string,
  end?: string,
): boolean => {
  if (!start || !end) return false;

  if (event.schedule.kind === "timed") {
    return (
      Date.parse(event.schedule.start) < Date.parse(end) &&
      Date.parse(event.schedule.end) > Date.parse(start)
    );
  }

  if (event.schedule.kind === "allDay") {
    const allDayStart = start.slice(0, 10);
    const allDayEnd = end.slice(0, 10);
    return event.schedule.start < allDayEnd && event.schedule.end > allDayStart;
  }

  return false;
};
