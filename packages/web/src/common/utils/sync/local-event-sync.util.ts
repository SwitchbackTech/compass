import { Event_Core } from "@core/types/event.types";
import {
  clearEventsFromIndexedDB,
  loadAllEventsFromIndexedDB,
} from "@web/common/utils/storage/event.storage.util";
import { EventApi } from "@web/ducks/events/event.api";

export async function syncLocalEventsToCloud(): Promise<number> {
  const events = await loadAllEventsFromIndexedDB();

  if (events.length === 0) {
    return 0;
  }

  await EventApi.create(events as Event_Core[]);
  await clearEventsFromIndexedDB();

  return events.length;
}
