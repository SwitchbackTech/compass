import { error } from "console";
import { ObjectId } from "mongodb";
import { Event_Core, Schema_Event_Recur_Base } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { EventError } from "@backend/common/constants/error.constants";
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
    const oldBase = await mongoService.db
      .collection(Collections.EVENT)
      .findOne({ [idKey]: updatedBase[idKey], user: this.userId });
    if (!oldBase) {
      throw error(
        EventError.MissingGevents,
        `Did not update series due to missing key-value (${idKey})`,
      );
    }

    const baseId = oldBase._id;

    // Update base event
    await mongoService.db
      .collection(Collections.EVENT)
      .updateOne(
        { _id: baseId, user: this.userId },
        { $set: { ...updatedBase, updatedAt: new Date() } },
      );

    // Update all instances by merging updatedBase into each instance (preserving instance-specific fields)
    const instances = await mongoService.db
      .collection(Collections.EVENT)
      .find({ "recurrence.eventId": String(baseId), user: this.userId })
      .toArray();

    for (const instance of instances) {
      // Merge: instance fields override base fields
      // Merge all fields from base, then all from instance, but always preserve instance.recurrence
      const { recurrence, updatedAt, ...baseForMerge } = updatedBase; // TODO turn into zod to strip there
      const merged = {
        ...baseForMerge,
        // ...instance,
        _id: instance._id,
        recurrence: { eventId: String(baseId) }, // always link to Compass base _id
        updatedAt: new Date(),
      };
      const result = await mongoService.db
        .collection(Collections.EVENT)
        .updateOne({ _id: instance._id, user: this.userId }, { $set: merged });
      console.log(result);
    }
  }
}
