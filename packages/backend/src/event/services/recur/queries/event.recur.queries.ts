import { error } from "console";
import { ObjectId } from "mongodb";
import { Schema_Event } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { GenericError } from "@backend/common/constants/error.constants";
import mongoService from "@backend/common/services/mongo.service";

/**
 * DB operations for Compass's Event collection, focused
 * on recurring event operations
 */

export const insertBaseEvent = async (event: Schema_Event) => {
  const eventWithId = {
    ...event,
    _id: event._id ? new ObjectId(event._id) : new ObjectId(),
  };
  return mongoService.db.collection(Collections.EVENT).insertOne(eventWithId);
};

export const insertEventInstances = async (instances: Schema_Event[]) => {
  const instancesWithIds = instances.map((instance) => ({
    ...instance,
    _id: instance._id ? new ObjectId(instance._id) : new ObjectId(),
  }));
  return mongoService.db
    .collection(Collections.EVENT)
    .insertMany(instancesWithIds);
};

export const updateBaseEventRecurrence = async (
  gEventId: string,
  recurrence: { rule: string[]; eventId: string },
) => {
  return mongoService.db
    .collection(Collections.EVENT)
    .updateOne({ gEventId }, { $set: { recurrence } });
};

export const deleteFutureInstances = async (
  baseEventId: string,
  fromDate: string,
) => {
  return mongoService.db.collection(Collections.EVENT).deleteMany({
    "recurrence.eventId": baseEventId,
    startDate: { $gte: fromDate },
  });
};

export const deleteAllInstances = async (baseEventId: string) => {
  return mongoService.db.collection(Collections.EVENT).deleteMany({
    "recurrence.eventId": baseEventId,
  });
};

export const deleteInstance = async (gEventId: string) => {
  return mongoService.db.collection(Collections.EVENT).deleteOne({
    gEventId,
  });
};

export const deleteInstances = async (userId: string, baseId: string) => {
  if (typeof baseId !== "string") {
    throw new Error("Invalid baseId");
  }
  const response = await mongoService.db
    .collection(Collections.EVENT)
    .deleteMany({
      user: userId,
      _id: { $ne: new ObjectId(baseId) },
      "recurrence.eventId": { $eq: baseId },
    });

  return response;
};

export const updateFutureInstances = async (
  userId: string,
  event: Schema_Event,
) => {
  const baseId = event.recurrence?.eventId;
  if (!baseId) {
    throw error(
      GenericError.BadRequest,
      "Failed to update future instances (No base event id)",
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
