import { Event_Core } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { compassLocalDB } from "./compass-local.db";

/**
 * Saves an event to IndexedDB. Uses put() to handle both new and existing events.
 */
export async function saveEventToIndexedDB(event: Event_Core): Promise<void> {
  if (!event._id) {
    throw new Error("Event must have an _id to save to IndexedDB");
  }

  await compassLocalDB.events.put(event);
}

/**
 * Loads events from IndexedDB filtered by date range and optionally by isSomeday flag.
 */
export async function loadEventsFromIndexedDB(
  startDate: string,
  endDate: string,
  isSomeday?: boolean,
): Promise<Event_Core[]> {
  // Get all events and filter in memory since we need to check date ranges
  // and isSomeday flag. Dexie's between() works on indexed fields but we
  // need to handle date string comparisons properly.
  let events = await compassLocalDB.events.toArray();

  // Filter by date range
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  events = events.filter((event) => {
    if (!event.startDate) return false;
    const eventStart = dayjs(event.startDate);
    return eventStart.isBetween(start, end, "day", "[]"); // inclusive on both ends
  });

  // Filter by isSomeday if specified
  if (isSomeday !== undefined) {
    events = events.filter((event) => event.isSomeday === isSomeday);
  }

  return events;
}

/**
 * Deletes an event from IndexedDB by its ID.
 */
export async function deleteEventFromIndexedDB(eventId: string): Promise<void> {
  await compassLocalDB.events.delete(eventId);
}

/**
 * Clears all events from IndexedDB. Used for migration cleanup.
 */
export async function clearEventsFromIndexedDB(): Promise<void> {
  await compassLocalDB.events.clear();
}
