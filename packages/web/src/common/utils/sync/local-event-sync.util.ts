import { Event_Core } from "@core/types/event.types";
import {
  ensureStorageReady,
  getStorageAdapter,
} from "@web/common/storage/adapter/adapter";
import { EventApi } from "@web/ducks/events/event.api";

export async function syncLocalEventsToCloud(): Promise<number> {
  await ensureStorageReady();
  const adapter = getStorageAdapter();
  const events = await adapter.getAllEvents();

  if (events.length === 0) {
    return 0;
  }

  await EventApi.create(events as Event_Core[]);
  await adapter.clearAllEvents();

  return events.length;
}
