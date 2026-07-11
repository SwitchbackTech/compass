import { Priorities } from "@core/constants/core.constants";
import { type DateOnly } from "@core/types/domain-primitives";
import { type Event } from "@core/types/event.contracts";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_EVENT_ACTION_MENU,
} from "@web/common/constants/web.constants";
import {
  type Schema_WebEvent,
  type Someday_EventsColumn,
} from "@web/common/types/web.event.types";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import { type Payload_ConvertEvent } from "@web/events/event.types";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import { parseSomedayEventBeforeSubmit } from "@web/views/Week/components/Draft/hooks/actions/submit.parser";

const downgradeRecurrenceToWeekly = (
  recurrence: Schema_WebEvent["recurrence"],
): Schema_WebEvent["recurrence"] => {
  if (!Array.isArray(recurrence?.rule)) return recurrence;

  return {
    ...recurrence,
    rule: recurrence.rule.map((rule) =>
      rule.startsWith("RRULE:")
        ? rule.replace(/FREQ=\w+;/, "FREQ=WEEKLY;")
        : rule,
    ),
  };
};

/**
 * Maps a calendar event (or draft) to the convertToSomeday mutation payload,
 * validated against SomedayEventSchema via the same parser the someday form
 * uses. Recurring rules are rewritten to weekly since someday events
 * resurface per week/month list, not on their original cadence.
 */
export const buildConvertToSomedayEvent = (
  event: Schema_WebEvent,
  dates: { startDate: string; endDate: string },
  order: number,
): Payload_ConvertEvent["event"] => {
  if (!event._id) {
    throw new Error("Cannot convert an event without an _id to someday");
  }

  const draft: Schema_Event = {
    ...event,
    isAllDay: false,
    startDate: dates.startDate,
    endDate: dates.endDate,
    order,
    recurrence: downgradeRecurrenceToWeekly(event.recurrence),
  };

  const validated = parseSomedayEventBeforeSubmit(draft, event.user ?? "");

  return validated as Payload_ConvertEvent["event"];
};

export const getSomedayEventCategory = (
  event: Schema_Event,
): Categories_Event.SOMEDAY_MONTH | Categories_Event.SOMEDAY_WEEK => {
  if (!event.isSomeday) {
    throw new Error(
      `Event is not a someday event. Event: ${JSON.stringify(event)}`,
    );
  }

  const startDate = dayjs(event.startDate);
  const endDate = dayjs(event.endDate);

  const diffInDays = endDate.diff(startDate, "day");

  if (diffInDays > 7) {
    return Categories_Event.SOMEDAY_MONTH;
  }
  return Categories_Event.SOMEDAY_WEEK;
};

/**
 * Categorizes normalized someday events into the sidebar's week/month
 * columns. Each backend read is already scoped to exactly one (period,
 * anchorDate) bucket (A35), so no date-range membership test or
 * recurrence-id dedup between columns is needed — `weekData`/`monthData` are
 * disjoint by construction. Each column sorts by `schedule.sortOrder`, the
 * contract's required field (no more client backfill for a missing legacy
 * `order`).
 *
 * Returns `Event`-shaped columns directly — the sidebar renderer consumes
 * the strict contract, no legacy `Schema_Event` bridge involved.
 */
export const categorizeSomedayEvents = (
  weekData: NormalizedEventQueryData | undefined,
  monthData: NormalizedEventQueryData | undefined,
): Someday_EventsColumn => {
  const bySortOrder = (data: NormalizedEventQueryData | undefined) =>
    data
      ? [...data.ids]
          .flatMap((id) => (data.entities[id] ? [data.entities[id]] : []))
          .sort((a, b) => {
            const left =
              a.schedule.kind === "someday" ? a.schedule.sortOrder : 0;
            const right =
              b.schedule.kind === "someday" ? b.schedule.sortOrder : 0;
            return left - right;
          })
      : [];

  const weekEvents = bySortOrder(weekData);
  const monthEvents = bySortOrder(monthData);

  const events: Someday_EventsColumn["events"] = {};
  for (const event of [...weekEvents, ...monthEvents]) {
    events[event.id] = event;
  }

  return {
    columns: {
      [COLUMN_WEEK]: {
        id: `${COLUMN_WEEK}`,
        eventIds: weekEvents.map((e) => e.id),
      },
      [COLUMN_MONTH]: {
        id: `${COLUMN_MONTH}`,
        eventIds: monthEvents.map((e) => e.id),
      },
    },
    columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
    events,
  };
};

// The sidebar's local draft/preview state holds strict `Event` objects, but
// the someday create/edit form and its supporting utils (submit.parser,
// web.date.util, event.util) still speak the legacy `Schema_Event` shape —
// see event.legacy-bridge.ts's own TODO. These two helpers are the reverse
// direction of `eventToSchemaEvent`: they build a best-effort `Event` from a
// `Schema_Event` at the specific points the sidebar needs to hand a
// Schema_Event-shaped draft/edit back into Event-typed local state
// (freshly-created events, drag-computed date ranges). Never sent to a
// mutation — those still submit the `Schema_Event`-shaped draft directly via
// the legacy adapter.
const someEventScheduleFromLegacy = (
  event: Schema_Event,
): Event["schedule"] => ({
  kind: "someday",
  period:
    dayjs(event.endDate).diff(dayjs(event.startDate), "day") > 7
      ? "month"
      : "week",
  // A brand-new draft has no startDate yet: leave anchorDate empty (not
  // today's date) so onSubmit's `!_event.startDate` check still detects
  // "not yet dated" and assigns the real target-category/view-range dates
  // via getDatesByCategory. Defaulting to today here would look plausible
  // but silently commits every new someday item to today's date instead of
  // the week/month bucket the user actually picked (verified via
  // `DEBUG insertEventIntoQueries`: with the today-default, a newly created
  // someday-week item's schedule.anchorDate never matched the visible
  // week-bucket query, so it silently never landed in the cache the sidebar
  // reads from).
  anchorDate: (event.startDate ?? "").slice(0, 10) as DateOnly,
  sortOrder: event.order ?? 0,
});

const someEventRecurrenceFromLegacy = (
  event: Schema_Event,
): Event["recurrence"] => {
  const rule = event.recurrence?.rule;

  if (Array.isArray(rule) && rule.length > 0) {
    return { kind: "series", rules: rule };
  }

  if (event.recurrence?.eventId) {
    return {
      kind: "occurrence",
      seriesId: event.recurrence.eventId as Event["id"],
    };
  }

  return { kind: "single" };
};

/**
 * Reapplies a legacy `Schema_Event`'s user-editable fields (title,
 * description, dates, recurrence, priority) onto an existing local `Event`,
 * keeping `id`/`calendarId` from `base` unless the schema event carries a
 * (real, already-persisted) id of its own.
 */
export const applySchemaEventToLocalEvent = (
  base: Event,
  schemaEvent: Schema_Event,
): Event => ({
  ...base,
  id: (schemaEvent._id ?? base.id) as Event["id"],
  content: {
    kind: "details",
    title: schemaEvent.title ?? "",
    description: schemaEvent.description ?? "",
  },
  schedule: someEventScheduleFromLegacy(schemaEvent),
  recurrence: someEventRecurrenceFromLegacy(schemaEvent),
  priority: schemaEvent.priority ?? base.priority,
});

/**
 * Builds a full local `Event` from a legacy `Schema_Event`, generating an id
 * if the schema event doesn't have one yet (a brand-new, unsaved draft).
 */
export const schemaEventToLocalEvent = (
  schemaEvent: Schema_Event,
  calendarId: string,
): Event => ({
  id: (schemaEvent._id ?? createObjectIdString()) as Event["id"],
  calendarId: calendarId as Event["calendarId"],
  content: {
    kind: "details",
    title: schemaEvent.title ?? "",
    description: schemaEvent.description ?? "",
  },
  schedule: someEventScheduleFromLegacy(schemaEvent),
  recurrence: someEventRecurrenceFromLegacy(schemaEvent),
  priority: schemaEvent.priority ?? Priorities.UNASSIGNED,
  createdAt: dayjs().toISOString() as Event["createdAt"],
  updatedAt: null,
});

export const isSomedayEventActionMenuOpen = () => {
  const actionMenu = document.getElementById(ID_SOMEDAY_EVENT_ACTION_MENU);
  return !!actionMenu;
};
