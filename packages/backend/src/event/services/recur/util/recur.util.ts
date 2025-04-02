import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { ObjectId } from "mongodb";
import { RRule } from "rrule";
import { RRULE } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  Schema_Event,
  Schema_Event_Core,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
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

/**
 * Generates instances for a recurring event based on its recurrence rule
 * @param baseEvent The base event with recurrence rule
 * @param maxInstances Maximum number of instances to generate (default: 100)
 * @returns Array of events including the base event and its instances
 */
export const generateRecurringInstances = (
  baseEvent: Schema_Event,
  maxInstances: number = 100,
): Schema_Event[] => {
  if (!baseEvent.recurrence?.rule || baseEvent.recurrence.rule.length === 0) {
    throw error(
      GenericError.DeveloperError,
      "Failed to generate recurring events: no recurrence rule provided",
    );
  }

  if (!baseEvent.startDate || !baseEvent.endDate) {
    throw error(
      GenericError.DeveloperError,
      "Failed to generate recurring events: missing start or end date",
    );
  }

  const baseId = baseEvent._id || new ObjectId().toString();
  const ruleString = baseEvent.recurrence.rule[0];
  if (!ruleString) {
    throw error(
      GenericError.DeveloperError,
      "Failed to generate recurring events: invalid recurrence rule",
    );
  }

  // Parse the base event dates with dayjs
  const baseStart = dayjs.utc(baseEvent.startDate);
  const baseEnd = dayjs.utc(baseEvent.endDate);
  const duration = baseEnd.diff(baseStart);

  // Create the RRule with the base event's start date
  const dtstart = baseStart.format("YYYYMMDDTHHmmss");
  const fullRuleString = `DTSTART=${dtstart}Z\n${ruleString};COUNT=${maxInstances}`;
  const rule = RRule.fromString(fullRuleString);

  // Get all dates from the rule
  const dates = rule.all();

  // Generate instances
  const instances = dates
    .slice(0, maxInstances)
    .map((date, index) => {
      // Skip the first date as it's the base event
      if (index === 0) return null;

      // Convert the RRule date to dayjs and maintain the same time as the base event
      const instanceStart = dayjs
        .utc(date)
        .hour(baseStart.hour())
        .minute(baseStart.minute())
        .second(0);

      const instanceEnd = instanceStart.add(duration);

      const instance: Schema_Event_Recur_Instance = {
        ...baseEvent,
        _id: undefined, // Let MongoDB generate the ID
        startDate: instanceStart.toISOString(),
        endDate: instanceEnd.toISOString(),
        recurrence: {
          eventId: baseId,
        },
      };

      return instance;
    })
    .filter(
      (instance): instance is Schema_Event_Recur_Instance => instance !== null,
    );

  // Create the base event
  const base: Schema_Event_Recur_Base = {
    ...baseEvent,
    _id: baseId,
    recurrence: {
      rule: [ruleString],
    },
  };

  return [base, ...instances];
};

/**
 * Base events have an `eventId` and an empty `rule`
 * @param event
 * @returns
 */
export const isBase = (event: Schema_Event) => {
  return (
    event.recurrence?.rule !== undefined &&
    event.recurrence.eventId === undefined
  );
};
/**
 * Instances have an `eventId` and an empty `rule`
 * @param event
 * @returns
 */
export const isInstance = (event: Schema_Event) => {
  return event.recurrence?.eventId && event.recurrence?.rule === undefined;
};

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
