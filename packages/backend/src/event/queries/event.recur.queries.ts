import { ObjectId } from "mongodb";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Ids_Event } from "./event.queries";

/**
 * DB operations for Compass's Event collection, focused
 * on recurring event operations
 */

export class RecurringEventRepository {
  constructor(private userId: string) {}

  /**
   * Delete all events in the series (both base and instances)
   * @param baseId - The _id of the base event
   * @returns The result of the deleteMany operation
   */
  async cancelSeries(baseId: string) {
    const result = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({
        $or: [
          { _id: new ObjectId(baseId) },
          { recurrence: { eventId: baseId } },
        ],
        user: this.userId,
      });

    return result;
  }

  async cancelInstance(id: string, params?: { idKey: Ids_Event }) {
    const idKey = params?.idKey || "_id";
    const filter = { [idKey]: id, user: this.userId };
    // Delete just this specific instance
    const result = await mongoService.db
      .collection(Collections.EVENT)
      .deleteOne(filter);

    return result;
  }
}
