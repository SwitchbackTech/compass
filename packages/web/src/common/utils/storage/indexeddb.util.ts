import { Params_Events, Schema_Event } from "@core/types/event.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { ClientEvent, compassLocalDB } from "./compass-local.db";

/**
 * Save an event to IndexedDB
 */
export const saveEventToIndexedDB = async (
  event: Schema_GridEvent,
): Promise<void> => {
  if (!event._id) {
    throw new Error("Event must have an _id to be saved to IndexedDB");
  }

  await compassLocalDB.events.put(event as ClientEvent);
};

/**
 * Get events from IndexedDB based on query parameters
 */
export const getEventsFromIndexedDB = async (
  params: Params_Events,
): Promise<Schema_Event[]> => {
  const { startDate, endDate, someday } = params;

  let query = compassLocalDB.events.toCollection();

  // Filter by isSomeday
  if (someday !== undefined) {
    query = compassLocalDB.events.where("isSomeday").equals(someday ? 1 : 0);
  }

  // Get all matching events
  let events = await query.toArray();

  // Filter by date range if provided
  if (startDate || endDate) {
    events = events.filter((event) => {
      if (!event.startDate) return false;

      const eventStart = new Date(event.startDate).getTime();
      const rangeStart = startDate ? new Date(startDate).getTime() : 0;
      const rangeEnd = endDate
        ? new Date(endDate).getTime()
        : Number.MAX_SAFE_INTEGER;

      return eventStart >= rangeStart && eventStart <= rangeEnd;
    });
  }

  return events as Schema_Event[];
};

/**
 * Delete an event from IndexedDB
 */
export const deleteEventFromIndexedDB = async (_id: string): Promise<void> => {
  await compassLocalDB.events.delete(_id);
};

/**
 * Update an event in IndexedDB
 */
export const updateEventInIndexedDB = async (
  _id: string,
  updates: Partial<Schema_Event>,
): Promise<void> => {
  const existing = await compassLocalDB.events.get(_id);
  if (!existing) {
    throw new Error(`Event with id ${_id} not found in IndexedDB`);
  }

  await compassLocalDB.events.put({
    ...existing,
    ...updates,
    _id, // Ensure _id is preserved
  } as ClientEvent);
};

/**
 * Clear all events from IndexedDB
 */
export const clearEventsFromIndexedDB = async (): Promise<void> => {
  await compassLocalDB.events.clear();
};
