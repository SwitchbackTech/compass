import type { calendar_v3 } from "@googleapis/calendar";
import { gSchema$Event } from "@core/types/gcal";
import dayjs, { Dayjs } from "@core/util/date/dayjs";

/** Google Calendar event utilities */
export const isCancelledGCalEvent = (e: gSchema$Event): boolean => {
  return e.status ? e.status === "cancelled" : false;
};

export const isGcalInstanceId = (e: gSchema$Event): boolean =>
  typeof e.id === "string" &&
  new RegExp(`^${e.recurringEventId}_\\d+(T\\d+Z?)?$`, "i").test(e.id);

/**
 * isBaseGCalEvent
 *
 * Base gCal events have an `id` field and a non-empty `recurrence` array field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isBaseGCalEvent = ({
  id,
  recurrence,
  recurringEventId,
}: gSchema$Event): boolean =>
  typeof id === "string" &&
  Array.isArray(recurrence) &&
  typeof recurringEventId !== "string";

/**
 * isInstanceGCalEvent
 *
 * Recurring Instances of gCal events have an undefined `recurrence` field
 * and a specified `recurringEventId` field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isInstanceGCalEvent = (e: gSchema$Event): boolean =>
  !Array.isArray(e.recurrence) &&
  typeof e.recurringEventId === "string" &&
  isGcalInstanceId(e);

/**
 * isRegularGCalEvent
 *
 * Regular standalone gCal events have an undefined `recurrence` field
 * and an undefined `recurringEventId` field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isRegularGCalEvent = (e: gSchema$Event): boolean =>
  !isBaseGCalEvent(e) && !isInstanceGCalEvent(e);

export const getGcalEventDateFormat = (
  eventDateTime: calendar_v3.Schema$EventDateTime = {},
): string => {
  const isAllDay = "date" in eventDateTime;
  const { YEAR_MONTH_DAY_FORMAT, RFC3339_OFFSET } = dayjs.DateFormat;
  const format = isAllDay ? YEAR_MONTH_DAY_FORMAT : RFC3339_OFFSET;

  return format;
};

/**
 * parseGCalEventDate
 *
 * parses gcal event date or dateTime into a Dayjs object
 *
 * the returned Dayjs object is in the timezone specified by the event
 *
 * you can convert it to system timezone by calling `.local()`
 */
export const parseGCalEventDate = (
  eventDateTime: calendar_v3.Schema$EventDateTime = {},
): Dayjs => {
  const { date, dateTime, timeZone } = eventDateTime;

  if (!date && !dateTime) {
    throw new Error("`date` or `dateTime` must be defined");
  }

  const format = getGcalEventDateFormat(eventDateTime);
  const timezone = timeZone ?? dayjs.tz.guess();

  return dayjs(date ?? dateTime, format).tz(timezone);
};
