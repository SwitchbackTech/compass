import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import { type StorageAdapter } from "@web/common/storage/adapter/storage.adapter";
import {
  isLocalDemoEvent,
  stripLocalOnlyEventFields,
} from "@web/common/storage/types/local-event.types";
import { EventApi } from "@web/ducks/events/event.api";

type LocalEventSyncStorage = Pick<
  StorageAdapter,
  "clearAllEvents" | "getAllEvents"
>;

type LocalEventSyncDependencies = {
  createEvents: typeof EventApi.create;
  ensureStorageReady: typeof ensureStorageReady;
  getStorageAdapter: () => LocalEventSyncStorage;
};

export function createSyncLocalEventsToCloud({
  createEvents,
  ensureStorageReady,
  getStorageAdapter,
}: LocalEventSyncDependencies) {
  return async function syncLocalEventsToCloud(): Promise<number> {
    await ensureStorageReady();
    const adapter = getStorageAdapter();
    const events = await adapter.getAllEvents();

    if (events.length === 0) {
      return 0;
    }

    const eventsToSync = events
      .filter((event) => !isLocalDemoEvent(event))
      .map(stripLocalOnlyEventFields);

    if (eventsToSync.length > 0) {
      await createEvents(eventsToSync);
    }

    await adapter.clearAllEvents();

    return eventsToSync.length;
  };
}

export const syncLocalEventsToCloud = createSyncLocalEventsToCloud({
  createEvents: EventApi.create,
  ensureStorageReady,
  getStorageAdapter,
});
