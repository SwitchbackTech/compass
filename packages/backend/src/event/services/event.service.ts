import { SOMEDAY_EVENTS_LIMIT } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  Schema_Event,
  Query_Event,
  Params_DeleteMany,
  Result_DeleteMany,
} from "@core/types/event.types";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import { error, EventError } from "@backend/common/errors/types/backend.errors";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";

import { getReadAllFilter } from "./event.service.helpers";

const logger = Logger("app:event.service");

class EventService {
  async create(userId: string, event: Schema_Event) {
    const _event = {
      ...event,
      _id: undefined,
      updatedAt: new Date(),
      user: userId,
    };
    const syncToGcal = !event.isSomeday;

    // must update gcal's data before Compass's (see Sync docs for explanation)
    if (syncToGcal) {
      const gEvent = await this._createGcalEvent(userId, event);
      _event.gEventId = gEvent.id as string;
    }

    /* Save to Compass */
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .insertOne(_event);

    if (response.acknowledged) {
      const _id = response.insertedId.toString();
      const eventWithId: Schema_Event = {
        ..._event,
        _id,
      };
      return eventWithId;
    } else {
      throw new BaseError(
        "Create Failed",
        response.toString(),
        Status.INTERNAL_SERVER,
        true
      );
    }
  }

  async createMany(events: Schema_Event[]) {
    const parsedEvents = events.map((e) => {
      const cleanedEvent = {
        ...e,
        _id: undefined,
      };
      return cleanedEvent;
    });

    const response = await mongoService.db
      .collection(Collections.EVENT)
      .insertMany(parsedEvents);

    if (response.acknowledged && response.insertedCount !== events.length) {
      throw error(
        EventError.MissingGevents,
        `Only ${response.insertedCount}/${events.length} saved`
      );
    }
  }

  /* 
  Deletes all of a user's events 
  REMINDER: this should only delete a user's *Compass* events --
            don't ever delete their events in gcal or any other 3rd party calendar
  */
  async deleteAllByUser(userId: string) {
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({ user: userId });
    return response;
  }

  async deleteById(userId: string, id: string) {
    /* 
    Part I: Validate
    */
    if (id === "undefined") {
      throw new BaseError(
        "Delete Failed",
        "no id provided ('undefined')",
        Status.BAD_REQUEST,
        true
      );
    }

    const filter = { _id: mongoService.objectId(id), user: userId };

    //get event so you can see the googleId
    const event = await mongoService.db
      .collection(Collections.EVENT)
      .findOne(filter);

    if (!event) {
      throw new BaseError(
        "Delete Failed",
        `Could not find event with id: ${id}`,
        Status.BAD_REQUEST,
        true
      );
    }

    const deleteFromGcal = !event["isSomeday"];
    const _event = event as unknown as Schema_Event;
    const gEventId = _event.gEventId;

    if (deleteFromGcal) {
      if (gEventId === undefined) {
        throw new BaseError(
          "Delete Failed",
          `GoogleEvent id cannot be null`,
          Status.BAD_REQUEST,
          true
        );
      }
      const gcal = await getGcalClient(userId);
      await gcalService.deleteEvent(gcal, gEventId);
    }

    /* 
      Part II: Delete
      */
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .deleteOne(filter);

    return response;
  }

  async deleteMany(
    userId: string,
    params: Params_DeleteMany
  ): Promise<Result_DeleteMany> {
    const errors = [];
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({ user: userId, [params.key]: { $in: params.ids } });

    if (response.deletedCount !== params.ids.length) {
      errors.push(
        `Only deleted ${response.deletedCount}/${params.ids.length} events`
      );
    }
    const result = { deletedCount: response.deletedCount, errors: errors };
    return result;
  }

  async readAll(
    userId: string,
    query: Query_Event
  ): Promise<Schema_Event[] | BaseError> {
    try {
      const filter = getReadAllFilter(userId, query);

      // (temporarily) limit number of results
      // to speed up development
      if (query.someday) {
        const response = (await mongoService.db
          .collection(Collections.EVENT)
          .find(filter)
          .limit(SOMEDAY_EVENTS_LIMIT)
          .sort({ startDate: 1 })
          .toArray()) as unknown as Schema_Event[];
        return response;
      } else {
        const response = (await mongoService.db
          .collection(Collections.EVENT)
          .find(filter)
          .toArray()) as unknown as Schema_Event[];
        return response;
      }
    } catch (e) {
      logger.error(e);
      return new BaseError("Read Failed", JSON.stringify(e), 500, true);
    }
  }

  async readById(userId: string, eventId: string) {
    const filter = {
      _id: mongoService.objectId(eventId),
      user: userId,
    };
    const event = await mongoService.db
      .collection(Collections.EVENT)
      .findOne(filter);

    if (event === null) {
      throw new BaseError(
        "Event not found",
        `Tried with user: ${userId} and _id: ${eventId}`,
        Status.NOT_FOUND,
        true
      );
    }

    return event;
  }

  async updateById(
    userId: string,
    eventId: string,
    event: Schema_Event
  ): Promise<Schema_Event | BaseError> {
    /* Part I: Gcal */
    const updateGcal = !event.isSomeday;
    if (updateGcal) {
      const wasSomedayEvent = event.gEventId === undefined;

      if (wasSomedayEvent) {
        const gEvent = await this._createGcalEvent(userId, event);
        event.gEventId = gEvent.id as string;
      } else {
        const gEvent = MapEvent.toGcal(event);
        const gcal = await getGcalClient(userId);
        await gcalService.updateEvent(gcal, event.gEventId as string, gEvent);
      }
    }

    /* Part II: Compass */
    if ("_id" in event) {
      delete event._id; // mongo doesn't allow changing this field directly
    }
    const _event = { ...event, updatedAt: new Date() };

    const response = await mongoService.db
      .collection(Collections.EVENT)
      .findOneAndReplace(
        { _id: mongoService.objectId(eventId), user: userId },
        _event,
        { returnDocument: "after" }
      );

    if (response.value === null || !response.ok) {
      logger.error("Update failed");
      throw new BaseError("Update Failed", "Ensure id is correct", 400, true);
    }
    const updatedEvent = response.value as unknown as Schema_Event;

    return updatedEvent;
  }

  async updateMany(userId: string, events: Schema_Event[]) {
    logger.error("not done implementing this operation");
    console.log(userId, events);
    return Promise.resolve(["not implemented"]);
  }

  /**********
   * Helpers
   *  (that have too many dependencies
   *  to put in event.service.helpers)
   *********/

  _createGcalEvent = async (userId: string, event: Schema_Event) => {
    const _gEvent = MapEvent.toGcal(event);

    const gcal = await getGcalClient(userId);
    const gEvent = await gcalService.createEvent(gcal, _gEvent);

    return gEvent;
  };
}

export default new EventService();
