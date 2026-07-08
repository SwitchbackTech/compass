import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_EVENT_ACTION_MENU,
} from "@web/common/constants/web.constants";
import {
  type Schema_SomedayEvent,
  type Schema_SomedayEventsColumn,
  type Schema_WebEvent,
} from "@web/common/types/web.event.types";
import { validateSomedayEvents } from "@web/common/validators/someday.event.validator";
import { type Payload_ConvertEvent } from "@web/events/event.types";
import { parseSomedayEventBeforeSubmit } from "@web/views/Week/components/Draft/hooks/actions/submit.parser";

const uniqBy = <T, K>(array: T[], iteratee: (item: T) => K): T[] => {
  const map = new Map<K, T>();
  for (const item of array) {
    const key = iteratee(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
};

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

export function eventsBetweenDates(
  events: Schema_SomedayEvent[],
  start: Dayjs,
  end: Dayjs,
): Schema_SomedayEvent[] {
  return events.filter((event) => {
    return dayjs(event.startDate).isBetween(start, end, null, "[]");
  });
}

export const categorizeSomedayEvents = (
  events: Schema_SomedayEventsColumn["events"],
  weekDates: { start: Dayjs; end: Dayjs },
): Schema_SomedayEventsColumn => {
  const { start: weekStart, end: weekEnd } = weekDates;
  const monthStart = weekStart.startOf("month");
  const monthEnd = weekStart.endOf("month");
  const _events = Object.values(events) as Schema_SomedayEvent[];
  const somedayEvents = validateSomedayEvents(_events);
  const _weekEvents = eventsBetweenDates(somedayEvents, weekStart, weekEnd);
  const _monthEvents = eventsBetweenDates(somedayEvents, monthStart, monthEnd);
  const weekEvents = uniqBy(_weekEvents, (e) => e.recurrence?.eventId ?? e._id);

  const otherMonthEvents = _monthEvents.filter(
    ({ _id, recurrence }) =>
      !weekEvents.some(
        (e) =>
          e._id === _id ||
          (typeof e.recurrence?.eventId === "string" &&
            e.recurrence?.eventId === recurrence?.eventId),
      ),
  );

  const monthEvents = uniqBy(
    otherMonthEvents,
    (e) => e.recurrence?.eventId ?? e._id,
  );

  const sortedData = {
    columns: {
      [COLUMN_WEEK]: {
        id: `${COLUMN_WEEK}`,
        eventIds: weekEvents
          .sort((a, b) => a.order - b.order)
          .map((e) => e._id!),
      },
      [COLUMN_MONTH]: {
        id: `${COLUMN_MONTH}`,
        eventIds: monthEvents
          .sort((a, b) => a.order - b.order)
          .map((e) => e._id!),
      },
    },
    columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
    events,
  };

  return sortedData;
};

/**
 * See https://github.com/SwitchbackTech/compass/issues/512 for more context.
 * Should be removed after we ensure that backend sets the order field for all someday events.
 */
export const setSomedayEventsOrder = (
  events: Schema_Event[],
): Schema_Event[] => {
  if (events.length === 0) return [];

  // Get existing valid orders
  const existingOrders = events
    .map((e) => e.order)
    .filter(
      (order): order is number =>
        typeof order === "number" && !Number.isNaN(order),
    )
    .sort((a, b) => a - b);

  // If no valid orders exist, assign sequential orders starting from 0
  if (existingOrders.length === 0) {
    return events.map((event, index) => ({ ...event, order: index }));
  }

  const highestOrder = existingOrders[existingOrders.length - 1];

  let nextNewOrder = highestOrder + 1;
  return events.map((event) => {
    if (typeof event.order === "number" && !Number.isNaN(event.order)) {
      return event;
    }

    const order = nextNewOrder++;
    return { ...event, order };
  });
};

export const isSomedayEventActionMenuOpen = () => {
  const actionMenu = document.getElementById(ID_SOMEDAY_EVENT_ACTION_MENU);
  return !!actionMenu;
};
