import {
  Recurrence,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { UserMetadata } from "@core/types/user.types";
import { Event_API } from "@backend/common/types/backend.event.types";

/** Event utilities for Compass events */

export const categorizeEvents = (events: Array<Schema_Event | Event_API>) => {
  const baseEvents = events.filter(isBase) as Schema_Event_Recur_Base[];
  const instances = events.filter(
    isExistingInstance,
  ) as Schema_Event_Recur_Instance[];
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
    Array.isArray(event?.recurrence?.rule) &&
    typeof event?.recurrence?.eventId !== "string"
  );
};

/**
 * Instance compass events have an `eventId` and an empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isInstanceWithoutId = (
  event: Pick<Schema_Event | Event_API, "recurrence" | "gRecurringEventId">,
): boolean => {
  return (
    !Array.isArray(event?.recurrence?.rule) &&
    typeof event?.recurrence?.eventId !== "string" &&
    typeof event?.gRecurringEventId === "string"
  );
};

/**
 * Instances with mongo Ids have an `eventId` and an empty `rule` within their `recurrence` field
 * @param event
 * @returns
 */
export const isExistingInstance = (
  event: Pick<Schema_Event | Event_API, "recurrence" | "gRecurringEventId">,
): boolean => {
  return (
    !Array.isArray(event?.recurrence?.rule) &&
    typeof event?.recurrence?.eventId === "string" &&
    typeof event?.gRecurringEventId === "string"
  );
};

export const isRegularEvent = (
  event: Pick<Schema_Event | Event_API, "recurrence">,
): boolean => !isExistingInstance(event) && !isBase(event);

/**
 * Filters the base events
 * @param e - The events array
 * @returns The base events
 */
export const filterBaseEvents = (e: Array<Schema_Event | Event_API>) => {
  const baseEvents = e.filter((e) => e.recurrence?.rule !== undefined);
  return baseEvents as Schema_Event_Recur_Base[];
};

/**
 * Filters the recurring events (base or instance)
 * @param e - The events array
 * @returns The recurring events (base or instance)
 */
export const filterExistingInstances = (e: Array<Schema_Event | Event_API>) =>
  e.filter(isExistingInstance);

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
