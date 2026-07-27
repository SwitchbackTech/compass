import { type QueryClient } from "@tanstack/react-query";
import { getOfflineDataStore } from "@web/common/storage/offline-data/offline-data.store.registry";
import { eventQueryKeys } from "@web/events/queries/event.query.keys";
import { eventMatchesRange } from "@web/events/queries/event.query.normalize";

export type DemoEventsRange = {
  start: string;
  end: string;
};

export async function hasDemoEvents(range?: DemoEventsRange): Promise<boolean> {
  const records = await getOfflineDataStore().getAllEvents();
  if (!range) {
    return records.some((record) => record.isDemo);
  }

  return records.some(
    (record) =>
      record.isDemo && eventMatchesRange(record.event, range.start, range.end),
  );
}

export async function clearDemoEvents(
  queryClient: QueryClient,
): Promise<number> {
  const store = getOfflineDataStore();
  const records = await store.getAllEvents();
  const demoRecords = records.filter((record) => record.isDemo);

  await Promise.all(demoRecords.map((record) => store.deleteEvent(record.id)));

  await queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });

  return demoRecords.length;
}
