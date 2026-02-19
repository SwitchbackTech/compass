/**
 * Event storage utilities - compatibility layer.
 *
 * @deprecated These functions delegate to the StorageAdapter.
 * New code should use getStorageAdapter() directly.
 *
 * @see {@link @web/common/storage/adapter}
 */
import { Event_Core } from "@core/types/event.types";
import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter";
import { handleDatabaseError } from "./db-errors.util";

/**
 * Saves an event to IndexedDB.
 * @deprecated Use getStorageAdapter().putEvent() instead
 */
export async function saveEventToIndexedDB(event: Event_Core): Promise<void> {
  if (!event._id) {
    throw new Error("Event must have an _id to save to IndexedDB");
  }

  try {
    await ensureStorageReady();
    await getStorageAdapter().putEvent(event);
  } catch (error) {
    handleDatabaseError(error, "save");
  }
}

/**
 * Loads events from IndexedDB filtered by date range and optionally by isSomeday flag.
 * @deprecated Use getStorageAdapter().getEvents() instead
 */
export async function loadEventsFromIndexedDB(
  startDate: string,
  endDate: string,
  isSomeday?: boolean,
): Promise<Event_Core[]> {
  try {
    await ensureStorageReady();
    return await getStorageAdapter().getEvents(startDate, endDate, isSomeday);
  } catch (error) {
    handleDatabaseError(error, "load");
  }
}

/**
 * Loads all events from IndexedDB without filtering.
 * @deprecated Use getStorageAdapter().getAllEvents() instead
 */
export async function loadAllEventsFromIndexedDB(): Promise<Event_Core[]> {
  try {
    await ensureStorageReady();
    return await getStorageAdapter().getAllEvents();
  } catch (error) {
    handleDatabaseError(error, "load");
  }
}

/**
 * Deletes an event from IndexedDB by its ID.
 * @deprecated Use getStorageAdapter().deleteEvent() instead
 */
export async function deleteEventFromIndexedDB(eventId: string): Promise<void> {
  try {
    await ensureStorageReady();
    await getStorageAdapter().deleteEvent(eventId);
  } catch (error) {
    handleDatabaseError(error, "delete");
  }
}

/**
 * Clears all events from IndexedDB.
 * @deprecated Use getStorageAdapter().clearAllEvents() instead
 */
export async function clearEventsFromIndexedDB(): Promise<void> {
  try {
    await ensureStorageReady();
    await getStorageAdapter().clearAllEvents();
  } catch (error) {
    handleDatabaseError(error, "clear");
  }
}
