import { type OfflineDataStore } from "@web/common/storage/offline-data/offline-data.store";
import {
  ensureOfflineDataStoreReady,
  getOfflineDataStore,
} from "@web/common/storage/offline-data/offline-data.store.registry";
import {
  isLocalDemoEvent,
  stripLocalOnlyEventFields,
} from "@web/common/storage/types/local-event.types";
import { EventApi } from "@web/ducks/events/event.api";

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

    const eventsToSync = events
      .filter((event) => !isLocalDemoEvent(event))
      .map(stripLocalOnlyEventFields);

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
