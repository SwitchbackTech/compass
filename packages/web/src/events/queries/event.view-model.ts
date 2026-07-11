import {
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  type EventWithDates,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { categorizeSomedayEvents } from "@web/common/utils/event/someday.event.util";
import { assignEventsToRow } from "@web/common/utils/grid/assign.row";
import { eventToSchemaEvent } from "./event.legacy-bridge";
import { type NormalizedEventQueryData } from "./event.query.types";

const eventsFrom = (data?: NormalizedEventQueryData): Event[] =>
  data?.ids.flatMap((id) => (data.entities[id] ? [data.entities[id]] : [])) ??
  [];

// assembleGridEvent/hasEventDates still operate on the legacy Schema_Event
// shape; bridged via eventToSchemaEvent until the grid renderer converts to
// `Event` directly. A cache entry with a missing/malformed `schedule` is a
// bug upstream (normalizeEventList/query seeding), not a case to silently
// swallow — but it must not crash this shared derivation, since every grid
// consumer recomputes from it on every render (a throw here becomes a
// render-crash loop). Log loudly and drop the offending event instead.
const isValidScheduledEvent = (event: Event): boolean => {
  const isValid =
    event.schedule != null && typeof event.schedule.kind === "string";
  if (!isValid) {
    console.error(
      `[event.view-model] dropping event ${event.id ?? "(no id)"} with malformed schedule`,
      event,
    );
  }
  return isValid;
};

const gridEventsFrom = (events: Event[], kind: "timed" | "allDay") =>
  events
    .filter(isValidScheduledEvent)
    .filter((event) => event.schedule.kind === kind)
    .map(eventToSchemaEvent)
    .filter((event): event is EventWithDates => hasEventDates(event))
    .map(assembleGridEvent);

const timedEventsFrom = (events: Event[]) => gridEventsFrom(events, "timed");

const allDayEventsFrom = (events: Event[]) =>
  assignEventsToRow(gridEventsFrom(events, "allDay")).allDayEvents;

const rowCountFrom = (events: Schema_GridEvent[]) => {
  const rows = events
    .map(({ row }) => row)
    .filter((row): row is number => row !== undefined);
  return rows.length === 0 ? 1 : Math.max(...rows);
};

type CalendarEventViewModel = {
  entities: NormalizedEventQueryData["entities"];
  events: Event[];
  timedEvents: Schema_GridEvent[];
  allDayEvents: Schema_GridEvent[];
  rowCount: number;
};

const computeCalendarEventViewModel = (
  data?: NormalizedEventQueryData,
): CalendarEventViewModel => {
  const events = eventsFrom(data);
  const timedEvents = timedEventsFrom(events);
  const allDayEvents = allDayEventsFrom(events);
  return {
    entities: data?.entities ?? {},
    events,
    timedEvents,
    allDayEvents,
    rowCount: rowCountFrom(allDayEvents),
  };
};

// Module-level memo keyed on the `query.data` object reference. The Week view
// model is consumed by many components; a per-hook `useMemo` recomputes the
// filter + grid assembly independently in each. Caching on the data reference
// (stable while the cache entry is unchanged) collapses that to a single
// derivation shared by every consumer, and keeps the result referentially
// stable across renders.
const viewModelCache = new WeakMap<
  NormalizedEventQueryData,
  CalendarEventViewModel
>();
const EMPTY_CALENDAR_VIEW_MODEL = computeCalendarEventViewModel(undefined);

export const deriveCalendarEventViewModel = (
  data?: NormalizedEventQueryData,
): CalendarEventViewModel => {
  if (!data) return EMPTY_CALENDAR_VIEW_MODEL;
  const cached = viewModelCache.get(data);
  if (cached) return cached;
  const result = computeCalendarEventViewModel(data);
  viewModelCache.set(data, result);
  return result;
};

/**
 * `week`/`month` are the two independently-cached someday query results for
 * the visible period's week and month buckets (kind: "someday"). Each bucket
 * is already scoped server-side to exactly one (period, anchorDate) pair
 * (A35), so categorization is just per-bucket sortOrder — see
 * {@link categorizeSomedayEvents}.
 */
export function deriveSomedayEventViewModel(
  week: NormalizedEventQueryData | undefined,
  month: NormalizedEventQueryData | undefined,
) {
  const categorized = categorizeSomedayEvents(week, month);
  const weekCount = categorized.columns[COLUMN_WEEK].eventIds.length;
  const monthCount = categorized.columns[COLUMN_MONTH].eventIds.length;
  return {
    events: categorized.events,
    orderedEvents: [
      ...categorized.columns[COLUMN_WEEK].eventIds,
      ...categorized.columns[COLUMN_MONTH].eventIds,
    ].flatMap((id) => (categorized.events[id] ? [categorized.events[id]] : [])),
    categorized,
    weekCount,
    monthCount,
    isAtWeeklyLimit: weekCount >= SOMEDAY_WEEKLY_LIMIT,
    isAtMonthlyLimit: monthCount >= SOMEDAY_MONTHLY_LIMIT,
  };
}
