import { AnyBulkWriteOperation, WithId } from "mongodb";
import {
  Payload_Order,
  Schema_Event,
  Schema_Event_Core,
} from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { EventError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
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

export const updateEvent = async (
  userId: string,
  eventId: string,
  event: Schema_Event_Core,
) => {
  const _event = {
    ...event,
    user: userId,
  };

  if ("_id" in event) {
    delete _event._id; // mongo doesn't allow changing this field directly
  }

  const response = (await mongoService.db
    .collection(Collections.EVENT)
    .findOneAndReplace(
      { _id: mongoService.objectId(eventId), user: userId },
      _event,
      { returnDocument: "after" },
    )) as unknown as WithId<Schema_Event>;

  if (!response) {
    throw error(
      EventError.NoMatchingEvent,
      "Event not updated due to failed DB operation",
    );
  }
  return response;
};
