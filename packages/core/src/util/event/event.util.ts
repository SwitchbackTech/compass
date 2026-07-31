import { type RRule } from "rrule";
import { type ParsedOptions } from "rrule/dist/esm/types";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";

/** Event utilities for Compass events */

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

/**
 * True when an event is part of a recurring series — either an instance
 * (has a series `eventId`) or a base with recurrence rules.
 */
export const isRecurringEvent = (
  event: Pick<CompassEvent, "recurrence">,
): boolean =>
  Boolean(event.recurrence?.eventId || event.recurrence?.rule?.length);

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
