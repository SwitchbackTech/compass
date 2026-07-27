import { Origin } from "@core/constants/core.constants";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import { type EventId } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { type EventColorSlot } from "@core/types/event-color.contracts";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import {
  assembleGridEvent,
  type EventWithDates,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import {
  isTimedEventMultiDay,
  timedMultiDayToAllDayDates,
} from "@web/common/utils/event/event-nudge.util";
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

// The grid renderer (assembleGridEvent) still consumes the CompassEvent
// shape rather than the core Event contract directly, scoped to scheduled
// (timed/allDay) events.
const scheduledEventToSchemaEvent = (event: Event): CompassEvent => {
  const { schedule } = event;
  return {
    _id: event.id,
    title:
      event.content.kind === "details" ? event.content.title : BUSY_EVENT_TITLE,
    description:
      event.content.kind === "details" ? event.content.description : "",
    origin: Origin.COMPASS,
    isAllDay: schedule.kind === "allDay",
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

// assembleGridEvent/hasEventDates still operate on the CompassEvent
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

// Re-attaches calendarId + isBusy + optional color onto the GridEvent
// produced by the Event -> CompassEvent -> GridEvent bridge above.
// scheduledEventToSchemaEvent returns the hand-written core `CompassEvent`
// shape (compass-event.contracts.ts), which has none of those fields, so the
// bridge itself can't carry them through without widening that shared type
// (used by 10+ unrelated consumers). Joining back by event id after
// assembleGridEvent keeps the bridge untouched and scopes the new fields to
// GridEvent only (packet 08 steps 5 and 8). isBusy backs the read-only gate
// - see isEventReadOnly in calendars/useCalendarLookup.ts.
const withCalendarMetadata = (
  events: Event[],
  gridEvents: GridEvent[],
  demoEventIds?: readonly EventId[],
): GridEvent[] => {
  const demoEventIdSet = new Set(demoEventIds ?? []);
  const metadataByEventId = new Map<
    string,
    {
      calendarId: Event["calendarId"];
      isBusy: boolean;
      color?: EventColorSlot;
    }
  >(
    events.map((event) => [
      event.id,
      {
        calendarId: event.calendarId,
        isBusy: event.content.kind === "busy",
        color:
          event.content.kind === "details"
            ? (event.content.color ?? undefined)
            : undefined,
      },
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
      isDemo: gridEvent._id
        ? demoEventIdSet.has(gridEvent._id as EventId)
        : false,
      ...(metadata?.color !== undefined ? { color: metadata.color } : {}),
    };
  });
};

// A series base is metadata-only: its schedule is the first occurrence's
// datetime (kept so the RRULE and series id are reachable for editing), but
// the first occurrence itself is a separately materialized doc that renders
// the actual card. Rendering the base too would double the first day.
const gridEventsFrom = (
  events: Event[],
  kind: "timed" | "allDay",
  demoEventIds?: readonly EventId[],
) => {
  const scheduled = events
    .filter(isValidScheduledEvent)
    .filter((event) => event.schedule.kind === kind)
    .filter((event) => event.recurrence.kind !== "series");
  const assembled = scheduled
    .map(scheduledEventToSchemaEvent)
    .filter((event): event is EventWithDates => hasEventDates(event))
    .map(assembleGridEvent);

  return withCalendarMetadata(scheduled, assembled, demoEventIds);
};

const timedEventsFrom = (events: Event[], demoEventIds?: readonly EventId[]) =>
  gridEventsFrom(events, "timed", demoEventIds).filter((event) => {
    if (!event.startDate || !event.endDate) return true;
    return !isTimedEventMultiDay(dayjs(event.startDate), dayjs(event.endDate));
  });

const multiDayTimedAsAllDayFrom = (
  events: Event[],
  demoEventIds?: readonly EventId[],
): GridEvent[] => {
  const scheduled = events
    .filter(isValidScheduledEvent)
    .filter((event) => event.recurrence.kind !== "series")
    .filter((event) => event.schedule.kind === "timed")
    .filter((event) => {
      const { start, end } = event.schedule;
      return isTimedEventMultiDay(dayjs(start), dayjs(end));
    });

  const assembled = scheduled.map((event) => {
    const { start, end } = event.schedule;
    const dates = timedMultiDayToAllDayDates(dayjs(start), dayjs(end));
    const schemaEvent: EventWithDates = {
      ...scheduledEventToSchemaEvent(event),
      isAllDay: true,
      startDate: dates.startDate,
      endDate: dates.endDate,
    };
    return {
      ...assembleGridEvent(schemaEvent),
      isTimedMultiDayDisplay: true,
    };
  });

  return withCalendarMetadata(scheduled, assembled, demoEventIds);
};

const allDayEventsFrom = (events: Event[], demoEventIds?: readonly EventId[]) =>
  assignEventsToRow([
    ...gridEventsFrom(events, "allDay", demoEventIds),
    ...multiDayTimedAsAllDayFrom(events, demoEventIds),
  ]).allDayEvents;

const rowCountFrom = (events: GridEvent[]) => {
  const rows = events
    .map(({ row }) => row)
    .filter((row): row is number => row !== undefined);
  return rows.length === 0 ? 1 : Math.max(...rows);
};

type CalendarEventViewModel = {
  entities: NormalizedEventQueryData["entities"];
  events: Event[];
  timedEvents: GridEvent[];
  allDayEvents: GridEvent[];
  rowCount: number;
  demoEventIds?: readonly EventId[];
};

const computeCalendarEventViewModel = (
  data?: NormalizedEventQueryData,
): CalendarEventViewModel => {
  const events = eventsFrom(data);
  const demoEventIds = data?.demoEventIds;
  const timedEvents = timedEventsFrom(events, demoEventIds);
  const allDayEvents = allDayEventsFrom(events, demoEventIds);
  return {
    entities: data?.entities ?? {},
    events,
    timedEvents,
    allDayEvents,
    rowCount: rowCountFrom(allDayEvents),
    demoEventIds,
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
