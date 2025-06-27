import { gSchema$Event } from "@core/types/gcal";

/** Google Calendar event utilities */
export const notCancelled = (e: gSchema$Event) => {
  return e.status && e.status !== "cancelled";
};

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
}: gSchema$Event) =>
  typeof id === "string" && Array.isArray(recurrence) && !recurringEventId;

/**
 * isInstanceGCalEvent
 *
 * Recurring Instances of gCal events have an undefined `recurrence` field
 * and a specified `recurringEventId` field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isInstanceGCalEvent = ({
  recurrence,
  recurringEventId,
}: gSchema$Event) => !recurrence && typeof recurringEventId === "string";

/**
 * isRegularGCalEvent
 *
 * Regular standalone gCal events have an undefined `recurrence` field
 * and an undefined `recurringEventId` field
 * https://developers.google.com/workspace/calendar/api/v3/reference/events#resource
 */
export const isRegularGCalEvent = ({
  recurrence,
  recurringEventId,
}: gSchema$Event) => !recurrence && !recurringEventId;
