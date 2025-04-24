/**
 * Event DB operations repo for Compass's Event collection
 */
import { ObjectId, WithId } from "mongodb";
import {
  Event_Core,
  Schema_Event,
  Schema_Event_Core,
} from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Ids_Event } from "@backend/event/queries/event.queries";

export class EventRepository {
  constructor(private userId: string) {}

  async deleteById(key: Ids_Event, id: string) {
    const result = await mongoService.db
      .collection(Collections.EVENT)
      .deleteOne({ [key]: id, user: this.userId });
    return result;
  }

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

  /**
   * Replace an event document by _id and user. Throws if no match.
   */
  async updateEvent(eventId: string, event: Schema_Event_Core) {
    const _event = {
      ...event,
      user: this.userId,
    };
    if ("_id" in event) {
      // WARNING: This is a hack to avoid the _id field from being updated
      // This may result in unexpected behavior
      delete _event._id;
    }
    const response = (await mongoService.db
      .collection(Collections.EVENT)
      .findOneAndReplace(
        { _id: new ObjectId(eventId), user: this.userId },
        _event,
        { returnDocument: "after" },
      )) as unknown as WithId<Schema_Event>;
    if (!response) {
      throw new Error(
        "Event not updated due to failed DB operation (NoMatchingEvent)",
      );
    }
    return response;
  }
}
