import { AnyBulkWriteOperation, WithId } from "mongodb";
import { Payload_Order, Schema_Event } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { getIdFilter } from "@backend/common/helpers/mongo.utils";
import mongoService from "@backend/common/services/mongo.service";

export type Ids_Event = "_id" | "gEventId" | "gRecurringEventId";

/**
 * DB operations for Compass's Event collection, focused
 * on primitive operations
 */

export const findCompassEventBy = async (key: Ids_Event, value: string) => {
  const filter = getIdFilter(key, value);

  const event = (await mongoService.db
    .collection(Collections.EVENT)
    .findOne(filter)) as unknown as WithId<Schema_Event | null>;

  return { eventExists: event !== null, event };
};

export const reorderEvents = async (userId: string, order: Payload_Order[]) => {
  const ops: AnyBulkWriteOperation[] = [];
  order.forEach((item) => {
    ops.push({
      updateOne: {
        filter: { _id: mongoService.objectId(item._id), user: userId },
        update: { $set: { order: item.order } },
      },
    });
  });

  const result = await mongoService.event.bulkWrite(ops);
  return result;
};
