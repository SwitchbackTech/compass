import { RRULE } from "@core/constants/core.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import {
  COLUMN_MONTH,
  COLUMN_WEEK,
  ID_SOMEDAY_EVENT_ACTION_MENU,
} from "@web/common/constants/web.constants";
import {
  Schema_SomedayEvent,
  Schema_SomedayEventsColumn,
} from "@web/common/types/web.event.types";
import { validateSomedayEvents } from "@web/common/validators/someday.event.validator";

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

export const categorizeSomedayEvents = (
  somedayEvents: Schema_SomedayEventsColumn["events"],
  weekDates: { start: Dayjs; end: Dayjs },
): Schema_SomedayEventsColumn => {
  const { start: weekStart, end: weekEnd } = weekDates;

  let events = Object.values(somedayEvents) as Schema_SomedayEvent[];

  events = validateSomedayEvents(events);

  const sortedEvents = events.sort((a, b) => a.order - b.order);

  const weekIds: string[] = [];
  const monthIds: string[] = [];

  sortedEvents.forEach((e) => {
    const eventStart = dayjs(e.startDate);
    const eventEnd = dayjs(e.endDate);
    const isWeek =
      eventStart.isSameOrAfter(weekStart) && eventEnd.isSameOrBefore(weekEnd);

    if (isWeek) {
      const isMonthRepeat = e?.recurrence?.rule?.includes(RRULE.MONTH);
      if (!isMonthRepeat) {
        weekIds.push(e._id!);
        return;
      }
    }

    const isFutureWeekThisMonth = e?.recurrence?.rule?.includes(RRULE.WEEK);
    if (isFutureWeekThisMonth) {
      return;
    }

    const monthStart = weekStart.startOf("month");
    const monthEnd = weekStart.endOf("month");
    const isMonth = eventStart.isBetween(monthStart, monthEnd, null, "[]");

    if (isMonth) {
      if (!e.recurrence?.eventId) monthIds.push(e._id!);
    }
  });

  const sortedData = {
    columns: {
      [COLUMN_WEEK]: {
        id: `${COLUMN_WEEK}`,
        eventIds: weekIds,
      },
      [COLUMN_MONTH]: {
        id: `${COLUMN_MONTH}`,
        eventIds: monthIds,
      },
    },
    columnOrder: [COLUMN_WEEK, COLUMN_MONTH],
    events: somedayEvents,
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
      (order): order is number => typeof order === "number" && !isNaN(order),
    )
    .sort((a, b) => a - b);

  // If no valid orders exist, assign sequential orders starting from 0
  if (existingOrders.length === 0) {
    return events.map((event, index) => ({ ...event, order: index }));
  }

  const lowestOrder = Math.min(0, existingOrders[0]); // Ensure we start at least from 0
  const highestOrder = existingOrders[existingOrders.length - 1];

  // Create a set of used orders for faster lookup
  const usedOrders = new Set(existingOrders);

  // Find all available orders in the range
  const availableOrders: number[] = [];
  for (let i = lowestOrder; i <= highestOrder; i++) {
    if (!usedOrders.has(i)) {
      availableOrders.push(i);
    }
  }

  // Process each event that needs an order
  let nextNewOrder = highestOrder + 1;
  return events.map((event) => {
    // Keep existing valid orders
    if (typeof event.order === "number" && !isNaN(event.order)) {
      return event;
    }

    // Assign next available order or append to end
    const order =
      availableOrders.length > 0 ? availableOrders.shift()! : nextNewOrder++;
    return { ...event, order };
  });
};

export const isSomedayEventActionMenuOpen = () => {
  const actionMenu = document.getElementById(ID_SOMEDAY_EVENT_ACTION_MENU);
  return !!actionMenu;
};
