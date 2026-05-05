import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import {
  isLocalDemoEvent,
  stripLocalOnlyEventFields,
} from "@web/common/storage/types/local-event.types";
import { EventApi } from "@web/ducks/events/event.api";

export async function syncLocalEventsToCloud(): Promise<number> {
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
    await EventApi.create(eventsToSync);
  }

  await adapter.clearAllEvents();

  return eventsToSync.length;
}
