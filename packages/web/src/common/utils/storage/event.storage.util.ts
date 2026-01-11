import { Event_Core } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
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

    console.log("[Storage] Event saved successfully:", event._id);
  } catch (error) {
    console.error("[Storage] Failed to save event:", error);
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
    // Ensure database is ready before operation
    await ensureDatabaseReady();

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

    console.log("[Storage] Loaded events:", {
      count: events.length,
      events: events.map((e) => ({ _id: e._id, title: e.title })),
    });

    return events;
  } catch (error) {
    console.error("[Storage] Failed to load events:", error);
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

    console.log("[Storage] Loaded all events:", {
      count: events.length,
    });

    return events;
  } catch (error) {
    console.error("[Storage] Failed to load all events:", error);
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

    console.log("[Storage] Event deleted successfully:", eventId);
  } catch (error) {
    console.error("[Storage] Failed to delete event:", error);
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

    console.log("[Storage] All events cleared successfully");
  } catch (error) {
    console.error("[Storage] Failed to clear events:", error);
    handleDatabaseError(error, "clear");
  }
}
