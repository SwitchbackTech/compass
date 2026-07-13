import {
  Origin,
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import { type Schema_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  type EventWithDates,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { categorizeSomedayEvents } from "@web/common/utils/event/someday.event.util";
import { assignEventsToRow } from "@web/common/utils/grid/assign.row";
import { type NormalizedEventQueryData } from "./event.query.types";

// The ONE authoritative spot for a busy event's display title (packet 08
// step 8, A18): the server never sends a busy event's real title/description
// (content is just `{ kind: "busy" }`), so this is a synthetic label for
// rendering only - never real content. Cards (below) and the read-only
// form's title position (EventForm.tsx) both read this constant rather than
// each hand-rolling the same fallback; a draft's actual editable `title`
// value (grid-event-draft.adapter.ts) stays "" for a busy source, since
// there's nothing real to duplicate/resubmit.
export const BUSY_EVENT_TITLE = "Busy";

// The grid renderer (assembleGridEvent) still consumes the legacy
// Schema_Event shape. This mirrors the mapping event.legacy-bridge.ts uses,
// scoped to scheduled (timed/allDay) events only — this file never sees
// someday events, so the someday-anchorDate branch there doesn't apply here.
const scheduledEventToSchemaEvent = (event: Event): Schema_Event => {
  const { schedule } = event;
  if (schedule.kind === "someday") {
    throw new Error("scheduledEventToSchemaEvent: someday event");
  }
  return {
    _id: event.id,
    title:
      event.content.kind === "details" ? event.content.title : BUSY_EVENT_TITLE,
    description:
      event.content.kind === "details" ? event.content.description : "",
    origin: Origin.COMPASS,
    priority: event.priority,
    isAllDay: schedule.kind === "allDay",
    isSomeday: false,
    startDate: schedule.start,
    endDate: schedule.end,
    recurrence:
      event.recurrence.kind === "series"
        ? { rule: [...event.recurrence.rules], eventId: event.id }
        : event.recurrence.kind === "occurrence"
          ? { eventId: event.recurrence.seriesId }
          : undefined,
    updatedAt: event.updatedAt ?? undefined,
  };
};

const eventsFrom = (data?: NormalizedEventQueryData): Event[] =>
  data?.ids.flatMap((id) => (data.entities[id] ? [data.entities[id]] : [])) ??
  [];

// assembleGridEvent/hasEventDates still operate on the legacy Schema_Event
// shape; bridged via scheduledEventToSchemaEvent above. A cache entry with a
// missing/malformed `schedule` is a bug upstream (normalizeEventList/query
// seeding), not a case to silently swallow — but it must not crash this
// shared derivation, since every grid
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

// Re-attaches calendarId + isBusy onto the Schema_GridEvent produced by the
// Event -> Schema_Event -> Schema_GridEvent bridge above. scheduledEventToSchemaEvent
// returns the legacy, hand-written core `Schema_Event` shape (event.types.ts),
// which has neither field, so the bridge itself can't carry them through
// without widening that shared type (used by 10+ unrelated consumers). Joining
// back by event id after assembleGridEvent keeps the bridge untouched and scopes
// the new fields to Schema_GridEvent only (packet 08 steps 5 and 8). isBusy
// backs the read-only gate - see isEventReadOnly in calendars/useCalendarLookup.ts.
const withCalendarMetadata = (
  events: Event[],
  gridEvents: Schema_GridEvent[],
): Schema_GridEvent[] => {
  const metadataByEventId = new Map<
    string,
    { calendarId: Event["calendarId"]; isBusy: boolean }
  >(
    events.map((event) => [
      event.id,
      { calendarId: event.calendarId, isBusy: event.content.kind === "busy" },
    ]),
  );
  return gridEvents.map((gridEvent) => {
    const metadata = gridEvent._id
      ? metadataByEventId.get(gridEvent._id)
      : undefined;
    return {
      ...gridEvent,
      calendarId: metadata?.calendarId,
      isBusy: metadata?.isBusy ?? false,
    };
  });
};

// A series base is metadata-only: its schedule is the first occurrence's
// datetime (kept so the RRULE and series id are reachable for editing), but
// the first occurrence itself is a separately materialized doc that renders
// the actual card. Rendering the base too would double the first day.
const gridEventsFrom = (events: Event[], kind: "timed" | "allDay") => {
  const scheduled = events
    .filter(isValidScheduledEvent)
    .filter((event) => event.schedule.kind === kind)
    .filter((event) => event.recurrence.kind !== "series");
  const assembled = scheduled
    .map(scheduledEventToSchemaEvent)
    .filter((event): event is EventWithDates => hasEventDates(event))
    .map(assembleGridEvent);

  return withCalendarMetadata(scheduled, assembled);
};

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
