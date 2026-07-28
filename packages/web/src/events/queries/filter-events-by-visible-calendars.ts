import { type Calendar } from "@core/types/calendar.contracts";
import { type NormalizedEventQueryData } from "./event.query.types";

// Module-level memo keyed on the (data, calendars) cache references — both
// are stable between cache writes. Without it, each consumer's useMemo builds
// a distinct filtered object whenever a calendar is hidden, which defeats
// deriveCalendarEventViewModel's WeakMap and re-runs the grid assembly once
// per consumer instead of once total.
const filteredCache = new WeakMap<
  NormalizedEventQueryData,
  WeakMap<Calendar[], NormalizedEventQueryData>
>();

// Drop events whose calendar is hidden. When calendars have not loaded yet,
// pass the data through unchanged so the grid does not flash empty.
export function filterEventsByVisibleCalendars(
  data: NormalizedEventQueryData | undefined,
  calendars: Calendar[] | undefined,
): NormalizedEventQueryData | undefined {
  if (!data || !calendars) return data;

  let byCalendars = filteredCache.get(data);
  if (!byCalendars) {
    byCalendars = new WeakMap();
    filteredCache.set(data, byCalendars);
  }
  const cached = byCalendars.get(calendars);
  if (cached) return cached;

  const result = computeFilteredData(data, calendars);
  byCalendars.set(calendars, result);
  return result;
}

function computeFilteredData(
  data: NormalizedEventQueryData,
  calendars: Calendar[],
): NormalizedEventQueryData {
  const visibleIds = new Set(
    calendars.filter((calendar) => calendar.isVisible).map((c) => c.id),
  );

  const ids = data.ids.filter((id) => {
    const event = data.entities[id];
    return event !== undefined && visibleIds.has(event.calendarId);
  });

  if (ids.length === data.ids.length) return data;

  const kept = new Set(ids);
  const entities = { ...data.entities };
  for (const id of data.ids) {
    if (!kept.has(id)) delete entities[id];
  }

  return {
    ...data,
    ids,
    entities,
  };
}
