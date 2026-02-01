import { Event_Core } from "@core/types/event.types";
import { isDateRangeOverlapping } from "@core/util/date/date.util";
import { compassLocalDB } from "./compass-local.db";
import { handleDatabaseError } from "./db-errors.util";
import { ensureDatabaseReady } from "./db-init.util";

/**
 * Saves an event to IndexedDB. Uses put() to handle both new and existing events.
 */
export async function saveEventToIndexedDB(event: Event_Core): Promise<void> {
  if (!event._id) {
    throw new Error("Event must have an _id to save to IndexedDB");
  }

  try {
    // Ensure database is ready before operation
    await ensureDatabaseReady();

    await compassLocalDB.events.put(event);
  } catch (error) {
    handleDatabaseError(error, "save");
  }
}

/**
 * Loads events from IndexedDB filtered by date range and optionally by isSomeday flag.
 */
export async function loadEventsFromIndexedDB(
  startDate: string,
  endDate: string,
  isSomeday?: boolean,
): Promise<Event_Core[]> {
  try {
    await ensureDatabaseReady();

    const allEvents = await compassLocalDB.events.toArray();

    return allEvents.filter((event) => {
      if (!event.startDate || !event.endDate) return false;
      if (isSomeday !== undefined && event.isSomeday !== isSomeday) {
        return false;
      }
      return isDateRangeOverlapping(
        event.startDate,
        event.endDate,
        startDate,
        endDate,
        "day",
      );
    });
  } catch (error) {
    handleDatabaseError(error, "load");
  }
}

/**
 * Loads all events from IndexedDB without filtering.
 */
export async function loadAllEventsFromIndexedDB(): Promise<Event_Core[]> {
  try {
    // Ensure database is ready before operation
    await ensureDatabaseReady();

    const events = await compassLocalDB.events.toArray();

    return events;
  } catch (error) {
    handleDatabaseError(error, "load");
  }
}

/**
 * Deletes an event from IndexedDB by its ID.
 */
export async function deleteEventFromIndexedDB(eventId: string): Promise<void> {
  try {
    // Ensure database is ready before operation
    await ensureDatabaseReady();

    await compassLocalDB.events.delete(eventId);
  } catch (error) {
    handleDatabaseError(error, "delete");
  }
}

/**
 * Clears all events from IndexedDB. Used for migration cleanup.
 */
export async function clearEventsFromIndexedDB(): Promise<void> {
  try {
    // Ensure database is ready before operation
    await ensureDatabaseReady();

    await compassLocalDB.events.clear();
  } catch (error) {
    handleDatabaseError(error, "clear");
  }
}
