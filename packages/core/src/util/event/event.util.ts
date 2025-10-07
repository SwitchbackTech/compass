import { RRule } from "rrule";
import { ParsedOptions } from "rrule/dist/esm/types";
import {
  Recurrence,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { UserMetadata } from "@core/types/user.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { Event_API } from "@backend/common/types/backend.event.types";

/** Event utilities for Compass events */

export const categorizeEvents = (events: Array<Schema_Event | Event_API>) => {
  const baseEvents = events.filter(isBase) as Schema_Event_Recur_Base[];
  const instances = events.filter(isInstance) as Schema_Event_Recur_Instance[];
  const standaloneEvents = events.filter(isRegularEvent);
  return { baseEvents, instances, standaloneEvents };
};

export const categorizeRecurringEvents = (events: Recurrence[]) => {
  const baseEvent = events.find(isBase) as Schema_Event_Recur_Base;
  const instances = events.filter(
    (e) => e !== baseEvent,
  ) as Schema_Event_Recur_Instance[];
  return { baseEvent, instances };
};

export const isAllDay = (
  event: Pick<Schema_Event | Event_API, "startDate" | "endDate">,
) =>
  event !== undefined &&
  // 'YYYY-MM-DD' has 10 chars
  event.startDate?.length === 10 &&
  event.endDate?.length === 10;

/**
 * Base compass events have no `eventId` and an non-empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isBase = (
  event: Pick<Schema_Event | Event_API, "recurrence">,
): boolean => {
  return (
    "recurrence" in event &&
    Array.isArray(event.recurrence?.rule) &&
    !("eventId" in event.recurrence)
  );
};

/**
 * Instance compass events have an `eventId` and an empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isInstance = (
  event: Pick<Schema_Event | Event_API, "recurrence" | "gRecurringEventId">,
): boolean => {
  return (
    "recurrence" in event &&
    typeof event.recurrence === "object" &&
    !("rule" in event.recurrence) &&
    typeof event.recurrence?.eventId === "string"
  );
};

export const isRegularEvent = (
  event: Pick<Schema_Event | Event_API, "recurrence">,
): boolean => !isInstance(event) && !isBase(event);

/**
 * Filters the base events
 * @param e - The events array
 * @returns The base events
 */
export const filterBaseEvents = (
  e: Array<Schema_Event | Event_API>,
): Schema_Event_Recur_Base[] => {
  return e.filter(isBase) as Schema_Event_Recur_Base[];
};

/**
 * Filters the recurring events (base or instance)
 * @param e - The events array
 * @returns The recurring events (base or instance)
 */
export const filterExistingInstances = (e: Array<Schema_Event | Event_API>) =>
  e.filter(isInstance) as Schema_Event_Recur_Instance[];

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

export const getCompassEventDateFormat = (
  date: Exclude<Schema_Event["startDate"], undefined>,
): string => {
  const allday = isAllDay({ startDate: date, endDate: date });
  const { YEAR_MONTH_DAY_FORMAT, RFC3339_OFFSET } = dayjs.DateFormat;
  const format = allday ? YEAR_MONTH_DAY_FORMAT : RFC3339_OFFSET;

  return format;
};

export const parseCompassEventDate = (
  date: Exclude<Schema_Event["startDate"], undefined>,
): Dayjs => {
  if (!date) throw new Error("`date` or `dateTime` must be defined");

  const format = getCompassEventDateFormat(date);
  const timezone = dayjs.tz.guess();

  return dayjs(date, format).tz(timezone);
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
