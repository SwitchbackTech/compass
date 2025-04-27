import { ObjectId } from "mongodb";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import { TestSetup } from "@backend/__tests__/helpers/mock.db.setup";
import { createRecurrenceSeries } from "@backend/__tests__/mocks.db/ccal.mock.db.util";
import { mockRecurringGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";

export const createSeries = async (setup: TestSetup) => {
  // Create base and instances in Compass,
  // that point to the original gcal base
  const { base: gcalBase } = mockRecurringGcalEvents({}, 2, 7);

  const compassBaseId = new ObjectId().toString();
  const compassBase = {
    title: gcalBase.summary as string,
    user: setup.userId,
    _id: compassBaseId,
    gEventId: gcalBase.id,
  };
  const compassInstanceTemplate = {
    title: gcalBase.summary as string,
    user: setup.userId,
    recurrence: {
      eventId: compassBaseId,
    },
  };
  const { meta } = await createRecurrenceSeries(
    setup,
    compassBase,
    compassInstanceTemplate,
  );

  return { meta, compassBaseId, gcalBaseId: gcalBase.id };
};

export const getCompassInstance = async (compassBaseId: string) => {
  // Query the Compass DB for actual recurring instances
  const allEvents = await getEventsInDb();
  // Filter to get only instance events (not the base)
  const instanceEvents = allEvents.filter(
    (e) => e.gRecurringEventId === compassBaseId,
  );

  return instanceEvents[0];
};
