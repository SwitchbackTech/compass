import { ObjectId } from "mongodb";
import { Event_Core } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Ids_Event } from "../../../queries/event.queries";

/**
 * Recurring event DB operations repo for Compass's Event collection
 */

export class RecurringEventRepository {
  constructor(public userId: string) {}

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

  async deleteInstancesAfter(baseId: string, afterDate: string) {
    const result = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({
        "recurrence.eventId": baseId,
        startDate: { $gt: afterDate },
        user: this.userId,
      });
    return result;
  }

  /**
   * Update an instance by its gEventId
   * @param updatedInstance - The updated instance
   * @returns The result of the update operation
   */
  async updateInstance(updatedInstance: Event_Core) {
    const gEventId = updatedInstance.gEventId;

    const result = await mongoService.db
      .collection(Collections.EVENT)
      .updateOne(
        { gEventId: gEventId, user: this.userId },
        { $set: updatedInstance },
      );
    return result;
  }
}
