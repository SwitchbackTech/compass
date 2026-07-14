import { type RRule } from "rrule";
import { type ParsedOptions } from "rrule/dist/esm/types";
import {
  type BaseEvent,
  type CompassEvent,
  type InstanceEvent,
} from "@core/types/compass-event.contracts";
import { type UserMetadata } from "@core/types/user.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

/** Event utilities for Compass events */

export const categorizeEvents = (events: Array<CompassEvent>) => {
  const baseEvents = events.filter(isBase) as BaseEvent[];
  const instances = events.filter(isInstance) as InstanceEvent[];
  const standaloneEvents = events.filter(isRegularEvent);
  return { baseEvents, instances, standaloneEvents };
};

export const isAllDay = (event: Pick<CompassEvent, "startDate" | "endDate">) =>
  event !== undefined &&
  // 'YYYY-MM-DD' has 10 chars
  event.startDate?.length === 10 &&
  event.endDate?.length === 10;

/**
 * Base compass events have no `eventId` and an non-empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isBase = (event: Pick<CompassEvent, "recurrence">): boolean => {
  return (
    "recurrence" in event &&
    event.recurrence !== undefined &&
    Array.isArray(event.recurrence.rule) &&
    !("eventId" in event.recurrence)
  );
};

/**
 * Instance compass events have an `eventId` and an empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isInstance = (
  event: Pick<CompassEvent, "recurrence" | "gRecurringEventId">,
): boolean => {
  return (
    "recurrence" in event &&
    typeof event.recurrence === "object" &&
    (!("rule" in event.recurrence) || event.recurrence?.rule === null) &&
    typeof event.recurrence?.eventId === "string"
  );
};

export const isRegularEvent = (
  event: Pick<CompassEvent, "recurrence">,
): boolean => !isInstance(event) && !isBase(event);

/**
 * True when an event is part of a recurring series — either an instance
 * (has a series `eventId`) or a base with recurrence rules.
 */
export const isRecurringEvent = (
  event: Pick<CompassEvent, "recurrence">,
): boolean =>
  Boolean(event.recurrence?.eventId || event.recurrence?.rule?.length);

export const shouldImportGCal = (metadata: UserMetadata): boolean => {
  const sync = metadata.sync;

  switch (sync?.importGCal) {
    case "IMPORTING":
    case "COMPLETED":
      return false;
    default:
      return true;
  }
};

export const shouldDoIncrementalGCalSync = (
  metadata: UserMetadata,
): boolean => {
  const sync = metadata.sync;

  switch (sync?.incrementalGCalSync) {
    case "IMPORTING":
    case "COMPLETED":
      return false;
    default:
      return true;
  }
};

export const getCompassEventDateFormat = (
  date: Exclude<CompassEvent["startDate"], undefined>,
): string => {
  const allday = isAllDay({ startDate: date, endDate: date });
  const { YEAR_MONTH_DAY_FORMAT, RFC3339_OFFSET } = dayjs.DateFormat;
  const format = allday ? YEAR_MONTH_DAY_FORMAT : RFC3339_OFFSET;

  return format;
};

export const parseCompassEventDate = (
  date: Exclude<CompassEvent["startDate"], undefined>,
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
