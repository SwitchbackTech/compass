import { Schema_Event, Schema_Event_Recur_Base } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

export const isAllDay = (event: Schema_Event) =>
  event !== undefined &&
  // 'YYYY-MM-DD' has 10 chars
  event.startDate?.length === 10 &&
  event.endDate?.length === 10;

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
export const filterRecurringEvents = (e: Schema_Event[]) =>
  e.filter((e) => e.recurrence !== undefined);
