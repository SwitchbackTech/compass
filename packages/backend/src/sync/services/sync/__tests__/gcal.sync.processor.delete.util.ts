import { ObjectId, WithId } from "mongodb";
import { createRecurrenceSeries } from "@backend/__tests__/mocks.db/ccal.mock.db.util";
import { mockRecurringGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { Schema_User } from "../../../../../../core/src/types/user.types";

export const createSeries = async (user: WithId<Schema_User>) => {
  // Create base and instances in Compass,
  // that point to the original gcal base
  const { base: gcalBase } = mockRecurringGcalEvents({}, 2, 7);

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
