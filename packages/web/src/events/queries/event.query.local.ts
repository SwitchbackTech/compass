import { EventListQuerySchema } from "@core/types/event-command.contracts";
import { getOfflineDataStore } from "@web/common/storage/offline-data/offline-data.store.registry";
import { normalizeLocalEventRecords } from "./event.query.normalize";
import { type NormalizedEventQueryData } from "./event.query.types";

type FetchLocalEventsPayload = { startDate: string; endDate: string };

export async function fetchLocalEventsRange(
  payload: FetchLocalEventsPayload,
): Promise<NormalizedEventQueryData> {
  if (!payload.startDate || !payload.endDate) {
    throw new Error("Event query requires startDate and endDate");
  }

  const query = EventListQuerySchema.parse({
    kind: "range",
    start: payload.startDate,
    end: payload.endDate,
  });

  const records = await getOfflineDataStore().getEvents(query);
  return normalizeLocalEventRecords(records);
}
