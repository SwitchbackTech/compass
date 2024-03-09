import { AnyBulkWriteOperation } from "mongodb";
import { Payload_Order, Schema_Event } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { getIdFilter } from "@backend/common/helpers/mongo.utils";
import mongoService from "@backend/common/services/mongo.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  EventError,
  GenericError,
} from "@backend/common/constants/error.constants";

type Ids_Event = "_id" | "gEventId";

export const deleteInstances = async (userId: string, baseId: string) => {
  const response = await mongoService.db
    .collection(Collections.EVENT)
    .deleteMany({
      user: userId,
      _id: { $ne: mongoService.objectId(baseId) },
      "recurrence.eventId": baseId,
    });

  return response;
};

export const findCompassEventBy = async (key: Ids_Event, value: string) => {
  const filter = getIdFilter(key, value);

  const event = (await mongoService.db
    .collection(Collections.EVENT)
    .findOne(filter)) as unknown as Schema_Event;

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
  event: Schema_Event
) => {
  const _event = { ...event };

  if ("_id" in event) {
    delete _event._id; // mongo doesn't allow changing this field directly
  }

  const response = await mongoService.db
    .collection(Collections.EVENT)
    .findOneAndReplace(
      { _id: mongoService.objectId(eventId), user: userId },
      _event,
      { returnDocument: "after" }
    );

  if (!response) {
    throw error(EventError.NoMatchingEvent, "Prompt Redux refresh");
  }
  return response;
};

export const updateFutureInstances = async (
  userId: string,
  event: Schema_Event
) => {
  const baseId = event.recurrence?.eventId;
  if (!baseId) {
    throw error(
      GenericError.BadRequest,
      "Failed to update future instances (No base event id)"
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, startDate, endDate, user, ...eventWithEligibleFields } = event;

  const futureInstances = {
    user: userId,
    "recurrence.eventId": baseId,
    startDate: { $gt: event.startDate },
  };

  const response = await mongoService.db
    .collection(Collections.EVENT)
    .updateMany(futureInstances, { $set: eventWithEligibleFields });

  return response;
};
