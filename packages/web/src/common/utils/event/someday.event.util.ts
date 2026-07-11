import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_EVENT_ACTION_MENU,
} from "@web/common/constants/web.constants";
import {
  type Schema_SomedayEventsColumn,
  type Schema_WebEvent,
} from "@web/common/types/web.event.types";
import { type Payload_ConvertEvent } from "@web/events/event.types";
import { eventToSchemaEvent } from "@web/events/queries/event.legacy-bridge";
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
 * Returns the legacy `Schema_SomedayEventsColumn` shape (bridged via
 * eventToSchemaEvent) so the sidebar components consuming it don't need to
 * change in this phase.
 * TODO(packet-03-phase-3c): return `Event`-shaped columns once the sidebar
 * renderer is converted, and drop the bridge.
 */
export const categorizeSomedayEvents = (
  weekData: NormalizedEventQueryData | undefined,
  monthData: NormalizedEventQueryData | undefined,
): Schema_SomedayEventsColumn => {
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

  const events: Schema_SomedayEventsColumn["events"] = {};
  for (const event of [...weekEvents, ...monthEvents]) {
    events[event.id] = eventToSchemaEvent(event);
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

export const isSomedayEventActionMenuOpen = () => {
  const actionMenu = document.getElementById(ID_SOMEDAY_EVENT_ACTION_MENU);
  return !!actionMenu;
};
