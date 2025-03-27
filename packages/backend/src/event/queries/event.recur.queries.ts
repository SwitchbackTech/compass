import { error } from "console";
import { Schema_Event } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { GenericError } from "@backend/common/constants/error.constants";
import mongoService from "@backend/common/services/mongo.service";

/**
 * DB operations for Compass's Event collection, focused
 * on recurring event operations
 */

export const insertBaseEvent = async (event: Schema_Event) => {
  return mongoService.db.collection(Collections.EVENT).insertOne(event);
};

export const insertEventInstances = async (instances: Schema_Event[]) => {
  return mongoService.db.collection(Collections.EVENT).insertMany(instances);
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
      _id: { $ne: mongoService.objectId(baseId) },
      "recurrence.eventId": { $eq: baseId },
    });

  return response;
};

export const updateInstance = async (
  userId: string,
  instance: Schema_Event,
) => {
  // await mongoService.db.collection(Collections.EVENT).updateOne(
  //   { gEventId: instance.id },
  //   {
  //     $set: {
  //       title: instance.summary,
  //       startDate: instance.start.dateTime,
  //       endDate: instance.end.dateTime,
  //       originalStartDate: instance.originalStartTime?.dateTime,
  //       updatedAt: instance.updated,
  //     },
  //   },
  // );
  const response = await mongoService.db
    .collection(Collections.EVENT)
    .updateOne(
      { user: userId, _id: mongoService.objectId(instance._id) },
      { $set: instance },
    );

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
