import { type OfflineDataStore } from "@web/common/storage/offline-data/offline-data.store";
import {
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";
import { isLocalDemoEvent } from "@web/common/storage/types/local-event.types";
import { EventApi } from "@web/events/event.api";

type LocalEventSyncStorage = Pick<
  OfflineDataStore,
  "clearAllEvents" | "getAllEvents"
>;

type LocalEventSyncDependencies = {
  createEvents: typeof EventApi.create;
  ensureOfflineDataStoreReady: typeof ensureOfflineDataStoreReady;
  getOfflineDataStore: () => LocalEventSyncStorage;
};

export function createSyncLocalEventsToCloud({
  createEvents,
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
}: LocalEventSyncDependencies) {
  return async function syncLocalEventsToCloud(): Promise<number> {
    await ensureOfflineDataStoreReady();
    const store = getOfflineDataStore();
    const events = await store.getAllEvents();

    if (events.length === 0) {
      return 0;
    }

    // No local-field stripping here: EventApi validates outbound events
    // against the backend schema, which drops local-only fields.
    const eventsToSync = events.filter((event) => !isLocalDemoEvent(event));

    if (eventsToSync.length > 0) {
      await createEvents(eventsToSync);
    }

    await store.clearAllEvents();

    return eventsToSync.length;
  };
}

export const syncLocalEventsToCloud = createSyncLocalEventsToCloud({
  createEvents: EventApi.create,
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
});
