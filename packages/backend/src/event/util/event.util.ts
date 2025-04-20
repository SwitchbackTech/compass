import {
  Recurrence,
  Schema_Event,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

export const categorizeEvents = (events: Schema_Event[]) => {
  const baseEvents = events.filter(isBase);
  const instances = events.filter(isExistingInstance);
  const regularEvents = events.filter(
    (e) => !isBase(e) && !isExistingInstance(e),
  );
  return { baseEvents, instances, regularEvents };
};

export const categorizeRecurringEvents = (events: Recurrence[]) => {
  const baseEvent = events.find(isBase) as Schema_Event_Recur_Base;
  const instances = events.filter(
    (e) => e !== baseEvent,
  ) as Schema_Event_Recur_Instance[];
  return { baseEvent, instances };
};

export const isAllDay = (event: Schema_Event) =>
  event !== undefined &&
  // 'YYYY-MM-DD' has 10 chars
  event.startDate?.length === 10 &&
  event.endDate?.length === 10;

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
export const isExistingInstance = (event: Schema_Event) => {
  return event.recurrence?.eventId && event.recurrence?.rule === undefined;
};

export const notCancelled = (e: gSchema$Event) => {
  return e.status && e.status !== "cancelled";
};

/**
 * Filters the base events
 * @param e - The events array
 * @returns The base events
 */
export const filterBaseEvents = (e: Schema_Event[]) => {
  const baseEvents = e.filter((e) => e.recurrence?.rule !== undefined);
  return baseEvents as Schema_Event_Recur_Base[];
};

/**
 * Filters the recurring events (base or instance)
 * @param e - The events array
 * @returns The recurring events (base or instance)
 */
export const filterExistingInstances = (e: Schema_Event[]) =>
  e.filter(isExistingInstance);
