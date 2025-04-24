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

    // Strip the properties that should not change
    const {
      recurrence,
      updatedAt,
      _id,
      startDate,
      endDate,
      user,
      ...baseForUpdate
    } = updatedBase;

    // Only works for timed events (not all-day)
    if (updatedBase.isAllDay) {
      // No need to adjust year/month/day value for all-day events
      const instResult = await mongoService.db
        .collection(Collections.EVENT)
        .updateMany(
          { "recurrence.eventId": String(baseId), user: this.userId },
          {
            $set: {
              ...baseForUpdate,
              updatedAt: new Date(),
            },
          },
        );
      console.log(
        `[updateSeries] Bulk updated ${instResult.modifiedCount} all-day instances for base ${baseId}`,
      );
    } else {
      // Update instances using MongoDB aggregation pipeline
      // to maintain year/day/month while updating the time
      const baseStartDate = new Date(updatedBase.startDate as string);
      const DATE_FORMAT = "%Y-%m-%dT%H:%M:%S%z";
      const baseEndDate = new Date(updatedBase.endDate as string);
      const instResult = await mongoService.db
        .collection(Collections.EVENT)
        .updateMany(
          { "recurrence.eventId": String(baseId), user: this.userId },
          [
            {
              $set: {
                ...baseForUpdate,
                startDate: {
                  $dateToString: {
                    date: {
                      $dateFromParts: {
                        year: { $year: { $toDate: "$startDate" } },
                        month: { $month: { $toDate: "$startDate" } },
                        day: { $dayOfMonth: { $toDate: "$startDate" } },
                        hour: { $hour: { $literal: baseStartDate } },
                        minute: { $minute: { $literal: baseStartDate } },
                        second: { $second: { $literal: baseStartDate } },
                        millisecond: {
                          $millisecond: { $literal: baseStartDate },
                        },
                      },
                    },
                    format: DATE_FORMAT,
                  },
                },
                endDate: {
                  $dateToString: {
                    date: {
                      $dateFromParts: {
                        year: { $year: { $toDate: "$endDate" } },
                        month: { $month: { $toDate: "$endDate" } },
                        day: { $dayOfMonth: { $toDate: "$endDate" } },
                        hour: { $hour: { $literal: baseEndDate } },
                        minute: { $minute: { $literal: baseEndDate } },
                        second: { $second: { $literal: baseEndDate } },
                        millisecond: {
                          $millisecond: { $literal: baseEndDate },
                        },
                      },
                    },
                    format: DATE_FORMAT,
                  },
                },
                updatedAt: new Date(),
              },
            },
          ],
        );
      console.log(
        `[updateSeries] Bulk updated ${instResult.modifiedCount} timed instances for base ${baseId} using aggregation pipeline`,
      );
    }
  }
}
