import { RRule } from "rrule";
import { ParsedOptions } from "rrule/dist/esm/types";
import {
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
} from "@core/types/event.types";
import { UserMetadata } from "@core/types/user.types";
import dayjs from "@core/util/date/dayjs";

/** Event utilities for Compass events */

export const categorizeEvents = (events: Schema_Event[]) => {
  const baseEvents = events.filter(isBase) as Schema_Base_Event[];
  const instances = events.filter(isInstance) as Schema_Instance_Event[];
  const regularEvents = events.filter(isRegularEvent);

  return { baseEvents, instances, regularEvents };
};

export const categorizeRecurringEvents = (
  events: Array<Schema_Base_Event | Schema_Instance_Event>,
) => {
  const baseEvent = events.find(isBase) as Schema_Base_Event;
  const instances = events.filter(
    (e) => e !== baseEvent,
  ) as Schema_Instance_Event[];
  return { baseEvent, instances };
};

/**
 * isAllDay
 *
 * determine if an event is an all-day event
 * this method assumes minute precision for event's time range
 */
export const isAllDay = (
  event: Pick<Schema_Event, "startDate" | "endDate">,
) => {
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);
  const sameDay = start.isSame(end, "day");
  const startsAtMidnight = start.hour() === 0 && start.minute() === 0;
  const endJustBeforeMidnight = end.hour() === 23 && end.minute() === 59;

  return sameDay && startsAtMidnight && endJustBeforeMidnight;
};

export const hasRRule = (event: Pick<Schema_Event, "recurrence">): boolean => {
  return "recurrence" in event && Array.isArray(event.recurrence?.rule);
};

/**
 * Instance compass events have an `eventId` and an empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isInstance = (
  event: Pick<Schema_Event, "recurrence">,
): boolean => {
  return (
    "recurrence" in event &&
    !!event.recurrence &&
    "eventId" in event.recurrence &&
    typeof event.recurrence?.eventId === "string"
  );
};

/**
 * Base compass events have no `eventId` and an non-empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isBase = (event: Pick<Schema_Event, "recurrence">): boolean => {
  return hasRRule(event) && !isInstance(event);
};

export const isRegularEvent = (
  event: Pick<Schema_Event, "recurrence">,
): boolean => !isInstance(event) && !isBase(event);

/**
 * Filters the base events
 * @param e - The events array
 * @returns The base events
 */
export const filterBaseEvents = (e: Schema_Event[]): Schema_Base_Event[] => {
  return e.filter(isBase) as Schema_Base_Event[];
};

/**
 * Filters the recurring events (base or instance)
 * @param e - The events array
 * @returns The recurring events (base or instance)
 */
export const filterExistingInstances = (e: Schema_Event[]) =>
  e.filter(isInstance) as Schema_Instance_Event[];

export const shouldImportGCal = (metadata: UserMetadata): boolean => {
  const sync = metadata.sync;

  switch (sync?.importGCal) {
    case "importing":
    case "completed":
      return false;
    case "restart":
    case "errored":
    default:
      return true;
  }
};

export const diffRRuleOptions = (
  rruleA: RRule,
  rruleB: RRule,
): Array<[keyof ParsedOptions, unknown]> => {
  const items = Object.entries(rruleA.options) as Array<
    [keyof ParsedOptions, unknown]
  >;

  return items.filter(([key, value]) => {
    const comparison = rruleB.options[key];
    const isArray = Array.isArray(value) && Array.isArray(comparison);
    const isDate = value instanceof Date && comparison instanceof Date;

    if (isDate) return !dayjs(value).isSame(comparison);

    if (isArray) {
      const sameLength = value.length === comparison.length;

      if (!sameLength) return true;

      return value.some((v) => !comparison.includes(v));
    }

    return value !== comparison;
  });
};
