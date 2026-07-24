import { type CreateEventInput } from "@core/types/event-command.contracts";
import { CalendarApi } from "@web/calendars/calendar.api";
import { getLocalCalendar } from "@web/calendars/calendar.util";
import { type OfflineDataStore } from "@web/common/storage/offline-data/offline-data.store";
import {
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";
import { type LocalEventRecord } from "@web/common/storage/types/local-event.record";
import { EventApi } from "@web/events/event.api";

type LocalEventSyncStorage = Pick<
  OfflineDataStore,
  "clearAllEvents" | "getAllEvents"
>;

type LocalEventSyncDependencies = {
  createEvent: typeof EventApi.create;
  listCalendars: typeof CalendarApi.list;
  ensureOfflineDataStoreReady: typeof ensureOfflineDataStoreReady;
  getOfflineDataStore: () => LocalEventSyncStorage;
};

// Maps a locally-stored record (calendarId = the client-generated sentinel)
// onto the server's own local calendar id, preserving the client-generated
// event id.
function toCreateInput(
  record: LocalEventRecord,
  serverLocalCalendarId: string,
): CreateEventInput {
  return {
    id: record.event.id,
    calendarId: serverLocalCalendarId as CreateEventInput["calendarId"],
    schedule: record.event.schedule,
    recurrence:
      record.event.recurrence.kind === "series"
        ? { kind: "series", rules: record.event.recurrence.rules }
        : { kind: "single" },
    // Local storage only ever holds "details" content (never a synthesized
    // "busy" block), so this narrowing cast is safe.
    content: record.event.content as CreateEventInput["content"],
  };
}

export function createSyncLocalEventsToCloud({
  createEvent,
  listCalendars,
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
}: LocalEventSyncDependencies) {
  return async function syncLocalEventsToCloud(): Promise<number> {
    await ensureOfflineDataStoreReady();
    const store = getOfflineDataStore();
    const records = await store.getAllEvents();

    if (records.length === 0) {
      return 0;
    }

    const recordsToSync = records.filter((record) => !record.isDemo);

    if (recordsToSync.length > 0) {
      const calendars = await listCalendars();
      const serverLocalCalendar = getLocalCalendar(calendars);

      // Never fall back to the client-generated sentinel calendar id: the
      // backend can't resolve it and rejects the POST with CALENDAR_NOT_FOUND
      // (a 404 that used to sign the just-signed-up user out). When the
      // server-side local calendar isn't available yet, keep the records
      // on-device - untouched, so a later sync can push them onto the real
      // calendar - rather than losing them to a rejected request.
      if (!serverLocalCalendar) {
        return 0;
      }

      for (const record of recordsToSync) {
        await createEvent(toCreateInput(record, serverLocalCalendar.id));
      }
    }

    await store.clearAllEvents();

    return recordsToSync.length;
  };
}

export const syncLocalEventsToCloud = createSyncLocalEventsToCloud({
  createEvent: EventApi.create,
  listCalendars: CalendarApi.list,
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
});
