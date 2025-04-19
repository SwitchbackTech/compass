import { ObjectId } from "mongodb";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

/**
 * DB operations for Compass's Event collection, focused
 * on recurring event operations
 */

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
