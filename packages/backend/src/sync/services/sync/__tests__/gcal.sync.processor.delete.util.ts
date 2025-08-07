import { ObjectId, WithId } from "mongodb";
import { Schema_User } from "@core/types/user.types";
import { createRecurrenceSeries } from "@backend/__tests__/mocks.db/ccal.mock.db.util";
import { mockRecurringGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";

export const createSeries = async (user: WithId<Schema_User>) => {
  // Create base and instances in Compass,
  // that point to the original gcal base
  const { base: gcalBase } = mockRecurringGcalEvents({}, false, {
    count: 2,
    interval: 7,
  });

  const compassBaseId = new ObjectId().toString();
  const compassBase = {
    title: gcalBase.summary as string,
    user: user._id.toString(),
    _id: compassBaseId,
    gEventId: gcalBase.id,
  };
  const compassInstanceTemplate = {
    title: gcalBase.summary as string,
    user: user._id.toString(),
    recurrence: {
      eventId: compassBaseId,
    },
  };
  const { meta } = await createRecurrenceSeries(
    compassBase,
    compassInstanceTemplate,
  );

  return { meta, compassBaseId, gcalBaseId: gcalBase.id };
};
