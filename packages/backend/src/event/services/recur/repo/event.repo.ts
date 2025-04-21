/**
 * Event DB operations repo for Compass's Event collection
 */
import { ObjectId } from "mongodb";
import { Event_Core } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Ids_Event } from "@backend/event/queries/event.queries";

export class EventRepository {
  constructor(private userId: string) {}

  /**
   * Update an event, creating it if it doesn't exist
   */
  async updateById(key: Ids_Event, event: Event_Core) {
    const _id = event?._id ? new ObjectId(event._id) : new ObjectId();
    if (!event?._id) {
      console.log("upserting event with new id:", _id);
    } else {
      console.log("upserting event with existing id:", event._id);
    }
    const result = await mongoService.db
      .collection(Collections.EVENT)
      .updateOne(
        { [key]: event[key], user: this.userId },
        { $set: event },
        { upsert: true },
      );
    return result;
  }
}
