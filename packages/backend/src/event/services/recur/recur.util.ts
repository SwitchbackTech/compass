import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { ObjectId } from "mongodb";
import { RRule } from "rrule";
import { RRULE } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_Event_Core } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

dayjs.extend(utc);

export const assembleInstances = (
  event: Schema_Event_Core,
  baseId?: string,
) => {
  if (
    !event.recurrence ||
    !event.recurrence.rule ||
    !event.recurrence.rule[0]
  ) {
    throw error(
      GenericError.DeveloperError,
      "Failed to assemble recurring events",
    );
  }

  const rule = event.recurrence.rule[0];
  const events = _generateInstances(rule, event, baseId);

  return events;
};

export type SeriesAction =
  | "CREATE_SERIES" // New recurring event
  | "MODIFY_SERIES" // Series modification (could be split or update)
  | "UPDATE_INSTANCE" // Single instance update
  | "DELETE_SERIES" // Delete entire series
  | "DELETE_INSTANCES"; // Delete one or more instances

export interface ActionAnalysis {
  action: SeriesAction;
  baseEvent?: gSchema$Event;
  modifiedInstance?: gSchema$Event;
  newBaseEvent?: gSchema$Event;
  endDate?: string;
  hasInstances?: boolean; // Whether the payload includes instances
}

/**
 * Analyzes an array of events from Google Calendar to determine the next action needed
 * to sync the database with Google Calendar's state.
 */
export function analyzeEventPayload(events: gSchema$Event[]): ActionAnalysis {
  if (!events || events.length === 0) {
    throw error(
      GenericError.DeveloperError,
      "Payloads not analyzed because no events provided",
    );
  }

  // Find base event and instances
  const baseEvent = events.find(
    (event) => event.recurrence && !event.recurringEventId,
  );
  const instances = events.filter((event) => event.recurringEventId);

  // If we have a single event with recurrence and no instances, it's a new series
  if (
    events.length === 1 &&
    baseEvent?.recurrence &&
    !baseEvent.recurringEventId
  ) {
    return {
      action: "CREATE_SERIES",
      baseEvent,
    };
  }

  // Check for cancelled events
  const cancelledEvents = events.filter(
    (event) => event.status === "cancelled",
  );

  // If we have no base event and all events are cancelled instances, it's a series deletion
  if (!baseEvent && cancelledEvents.length === events.length) {
    return {
      action: "DELETE_SERIES",
    };
  }

  // If we have a base event and cancelled instances, it's an instance deletion
  if (baseEvent && cancelledEvents.length > 0) {
    return {
      action: "DELETE_INSTANCES",
      baseEvent,
      modifiedInstance: cancelledEvents[0],
    };
  }

  // If we have a base event with UNTIL rule and no cancelled instances, it's a series modification
  if (baseEvent?.recurrence?.some((rule) => rule.includes("UNTIL"))) {
    // Find the new base event - it should have recurrence but no UNTIL
    const newBaseEvent = events.find(
      (event) =>
        event.recurrence &&
        !event.recurringEventId &&
        event.id !== baseEvent?.id &&
        !event.recurrence.some((rule) => rule.includes("UNTIL")),
    );

    if (newBaseEvent) {
      return {
        action: "MODIFY_SERIES",
        baseEvent,
        newBaseEvent,
        endDate: baseEvent.recurrence
          .find((rule) => rule.includes("UNTIL"))
          ?.split("=")[1],
        hasInstances: instances.length > 0,
      };
    }
  }

  // If we have instances that point to the base event, it's an instance update
  if (
    baseEvent &&
    instances.length > 0 &&
    instances.every((instance) => instance.recurringEventId === baseEvent.id)
  ) {
    return {
      action: "UPDATE_INSTANCE",
      baseEvent,
      modifiedInstance: instances[0],
    };
  }

  // Default case - treat as regular update
  if (!events[0]) {
    throw error(
      GenericError.DeveloperError,
      "Payloads not analyzed because no events provided",
    );
  }

  throw error(
    GenericError.DeveloperError,
    "Event not inferred because not all cases were handled",
  );
}

const _generateInstances = (
  rule: string,
  orig: Schema_Event_Core,
  baseId?: string,
) => {
  if (!orig.startDate || !orig.endDate) {
    throw error(GenericError.DeveloperError, "Failed to generate events");
  }

  const _id = baseId ? baseId : new ObjectId().toString();

  const fullRule = _getRule(rule, orig.startDate, orig.endDate);
  const _dates = fullRule.all();
  const dates = _dates;

  const instances = dates.map((date) => {
    const { startDate, endDate } = _getDates(rule, date);

    const event = {
      ...orig,
      _id: undefined,
      startDate,
      endDate,
      recurrence: {
        rule: [rule],
        eventId: _id,
      },
    };

    delete event.order;
    return event;
  });

  const base = {
    ...orig,
    _id: new ObjectId(_id),
    recurrence: { rule: [rule], eventId: _id },
  };
  const includeBase = baseId === undefined;
  const events = includeBase ? [base, ...instances] : [...instances];

  return events;
};

const _getDates = (rule: string, nextInstance: Date) => {
  let start: Dayjs = dayjs.utc(nextInstance);
  let end: Dayjs;

  if (rule === RRULE.WEEK) {
    start = dayjs.utc(nextInstance);
    end = start.add(6, "day");
  } else if (rule === RRULE.MONTH) {
    start = start.startOf("month");
    end = start.endOf("month");
  } else {
    throw error(
      GenericError.DeveloperError,
      "Failed to get dates (rule not supported yet)",
    );
  }

  return {
    startDate: start.format(YEAR_MONTH_DAY_FORMAT),
    endDate: end.format(YEAR_MONTH_DAY_FORMAT),
  };
};

const _getRule = (rule: string, startDate: string, endDate: string) => {
  const nextStart = _getNextStart(rule, startDate, endDate)
    .utc()
    .format("YYYYMMDDThhmmss");

  const _rule = `DTSTART=${nextStart}Z\n${rule}`;
  const fullRule = RRule.fromString(_rule);
  return fullRule;
};

const _getNextStart = (rule: string, startDate: string, endDate: string) => {
  switch (rule) {
    case RRULE.WEEK:
      return _getNextSunday(startDate);
      break;
    case RRULE.MONTH:
      return _getNextMonth(endDate);
      break;
    default:
      throw error(GenericError.DeveloperError, "Failed to get next start");
  }
};

const _getNextMonth = (target: string) => {
  const date = dayjs(target, YEAR_MONTH_DAY_FORMAT).hour(0).minute(0).second(0);

  const firstOfNextMonth = date.add(1, "month").date(1);
  return firstOfNextMonth;
};

const _getNextSunday = (startDate: string) => {
  const date = dayjs(startDate, YEAR_MONTH_DAY_FORMAT)
    .hour(0)
    .minute(0)
    .second(0);

  const dayOfWeek = date.day();

  let daysUntilNextSunday = (7 - dayOfWeek) % 7;
  if (daysUntilNextSunday === 0) {
    daysUntilNextSunday = 7;
  }

  const nextSunday = date.add(daysUntilNextSunday, "day");
  return nextSunday;
};
