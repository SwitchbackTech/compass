import { Collections } from "@backend/common/constants/collections";
import { getIdFilter } from "@backend/common/helpers/mongo.utils";
import mongoService from "@backend/common/services/mongo.service";
import { Schema_Event } from "@core/types/event.types";

type Ids_Event = "_id" | "gEventId";

export const findCompassEventBy = async (key: Ids_Event, value: string) => {
  const filter = getIdFilter(key, value);

  const event = (await mongoService.db
    .collection(Collections.EVENT)
    .findOne(filter)) as unknown as Schema_Event;

  return { eventExists: event !== null, event };
};
