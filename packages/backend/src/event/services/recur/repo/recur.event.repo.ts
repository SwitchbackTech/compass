import { ObjectId } from "mongodb";
import { Event_Core, Schema_Event_Recur_Base } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Ids_Event } from "../../../queries/event.queries";
import {
  getOldBaseId,
  updateAllDayInstances,
  updateTimedInstances,
} from "./recur.event.repo.util";

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

  /**
   * Delete all instances after a specific date
   * @param baseId - The _id of the base event
   * @param afterDate - ISO 8601 date string
   * @returns The result of the deleteMany operation
   */
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
        { $set: { ...updatedInstance, updatedAt: new Date() } },
      );
    return result;
  }

  /**
   * Update the base event and all instances in the series with the provided payload.
   * Uses the provided idKey (e.g. 'gEventId', '_id', etc) to find the base event.
   */
  async updateSeries(updatedBase: Schema_Event_Recur_Base, idKey: Ids_Event) {
    // Find base event
    const baseId = await getOldBaseId(updatedBase, idKey, this.userId);

    // Update base event
    await mongoService.db
      .collection(Collections.EVENT)
      .updateOne(
        { _id: baseId, user: this.userId },
        { $set: { ...updatedBase, updatedAt: new Date() } },
      );

    if (updatedBase.isAllDay) {
      await updateAllDayInstances(baseId, updatedBase, this.userId);
    } else {
      await updateTimedInstances(baseId, updatedBase, this.userId);
    }
  }
}
