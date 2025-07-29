import { gSchema$Event } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";

/** Google Calendar event utilities */
export const isCancelledGCalEvent = (e: gSchema$Event): boolean => {
  return e.status ? e.status === "cancelled" : false;
};

export const recreateGCalInstanceId = ({
  recurringEventId,
  originalStartTime,
  start,
}: gSchema$Event): string => {
  const originalStart = originalStartTime?.dateTime ?? originalStartTime?.date;
  const currentStart = start?.dateTime ?? start?.date;
  const startDate = originalStart ?? currentStart;
  const timezone = originalStartTime?.timeZone ?? start?.timeZone;
  const rfc5545Date = dayjs.tz(startDate, timezone!);
  const rfc5545String = rfc5545Date.toRFC5545String();

  return `${recurringEventId}_${rfc5545String}`;
};

export const isGcalInstanceId = (e: gSchema$Event): boolean =>
  e.id === recreateGCalInstanceId(e);

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
  typeof id === "string" && Array.isArray(recurrence) && !recurringEventId;

/**
 * isInstanceGCalEvent
 *
 * Recurring Instances of gCal events have an undefined `recurrence` field
 * and a specified `recurringEventId` field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isInstanceGCalEvent = (e: gSchema$Event): boolean =>
  !e.recurrence &&
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
