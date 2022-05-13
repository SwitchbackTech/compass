//@ts-nocheck
import { InsertManyResult } from "mongodb";
import { Result_Import_Gcal } from "@core/types/sync.types";
import { gSchema$Event } from "@core/types/gcal";
import { SOMEDAY_EVENTS_LIMIT } from "@core/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  Schema_Event,
  Query_Event,
  Params_DeleteMany,
  Result_DeleteMany,
} from "@core/types/event.types";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import { yearsAgo } from "@backend/common/helpers/common.helpers";
import { getGcal } from "@backend/auth/services/google.auth.service";
import { Origin } from "@core/core.constants";
import { gCalendar, gParamsEventsList } from "@core/types/gcal";

import { getReadAllFilter } from "./event.service.helpers";

const logger = Logger("app:event.service");

class EventService {
  async create(
    userId: string,
    event: Schema_Event
  ): Promise<Schema_Event | BaseError> {
    try {
      const _event = {
        ...event,
        user: userId,
      };

      const syncToGcal = !event.isSomeday;

      if (syncToGcal) {
        const gEvent = await this._createGcalEvent(userId, event);
        _event["gEventId"] = gEvent.id;
      }

      /* Save to Compass */
      const response = await mongoService.db
        .collection(Collections.EVENT)
        .insertOne(_event);

      if ("acknowledged" in response) {
        const eventWithId: Schema_Event = {
          ..._event,
          _id: response.insertedId.toString(),
        };
        return eventWithId;
      } else {
        return new BaseError(
          "Create Failed",
          response.toString(),
          Status.INTERNAL_SERVER,
          true
        );
      }
    } catch (e) {
      logger.error(e);
      return new BaseError(
        "Create Failed",
        e.message,
        Status.INTERNAL_SERVER,
        true
      );
    }
  }

  async createMany(
    userId: string,
    data: Schema_Event[]
  ): Promise<InsertManyResult | BaseError> {
    //TODO verify userId exists first (?)
    // TODO catch BulkWriteError

    const response = await mongoService.db
      .collection(Collections.EVENT)
      .insertMany(data);

    if ("insertedCount" in response && response.insertedCount > 0) {
      return response;
    } else {
      return new BaseError("Create Failed", response.toString(), 500, true);
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
      return new BaseError(
        "Delete Failed",
        "no id provided ('undefined')",
        Status.BAD_REQUEST,
        true
      );
    }

    try {
      const filter = { _id: mongoService.objectId(id), user: userId };

      //get event so you can see the googleId
      const event: Schema_Event = await mongoService.db
        .collection(Collections.EVENT)
        .findOne(filter);

      if (!event) {
        return new BaseError(
          "Delete Failed",
          `Could not find event with id: ${id}`,
          Status.BAD_REQUEST,
          true
        );
      }

      const deleteFromGcal = !event.isSomeday;
      const { gEventId } = event;

      if (deleteFromGcal && gEventId === undefined) {
        return new BaseError(
          "Delete Failed",
          `GoogleEvent id cannot be null`,
          Status.BAD_REQUEST,
          true
        );
      }

      /* 
      Part II: Delete
      */
      const response = await mongoService.db
        .collection(Collections.EVENT)
        .deleteOne(filter);

      if (deleteFromGcal) {
        const gcal = await getGcal(userId);
        // no await because gcal doesnt return much of a response,
        // so there's no use in waiting for it to finish
        gcalService.deleteEvent(gcal, gEventId);
      }

      return response;
    } catch (e) {
      logger.error(e);
      return new BaseError("Delete Failed!", e, Status.INTERNAL_SERVER, true);
    }
  }

  async deleteMany(
    userId: string,
    params: Params_DeleteMany
  ): Promise<Result_DeleteMany> {
    const errors = [];
    try {
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
    } catch (e) {
      logger.error(e);
      throw new BaseError("DeleteMany Failed", e, 500, true);
    }
  }

  async import(userId: string, gcal: gCalendar): Promise<Result_Import_Gcal> {
    try {
      let nextPageToken = undefined;
      let nextSyncToken = undefined;
      let total = 0;
      const errors = [];

      const numYears = 1;
      logger.info(
        `Importing past ${numYears} years of GCal events for user: ${userId}`
      );
      const xYearsAgo = yearsAgo(numYears);

      // always fetches once, then continues until
      // there are no more events
      do {
        const params: gParamsEventsList = {
          calendarId: GCAL_PRIMARY,
          timeMin: xYearsAgo,
          pageToken: nextPageToken,
        };
        const gEvents = await gcalService.getEvents(gcal, params);
        if (gEvents.data.items) total += gEvents.data.items.length;

        if (gEvents.data.items) {
          const cEvents = MapEvent.toCompass(
            userId,
            gEvents.data.items,
            Origin.GOOGLE_IMPORT
          );
          const response: InsertManyResult = await this.createMany(
            userId,
            cEvents
          );
          if (
            response.acknowledged &&
            response.insertedCount !== cEvents.length
          ) {
            errors.push(
              `Only ${response.insertedCount}/${cEvents.length} imported`
            );
          }

          nextPageToken = gEvents.data.nextPageToken;
          nextSyncToken = gEvents.data.nextSyncToken;
        } else {
          logger.error("unexpected empty values in events");
        }
      } while (nextPageToken !== undefined);

      const summary = {
        total: total,
        nextSyncToken: nextSyncToken,
        errors: errors,
      };
      return summary;
    } catch (e) {
      // TODO catch 401 error and start from the top
      // this shouldn't happen for a first-time import
      logger.error(e.message);

      const errorSummary = {
        total: -1,
        nextSyncToken: "unsure",
        errors: [e],
      };
      return errorSummary;
    }
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
        const response: Schema_Event[] = await mongoService.db
          .collection(Collections.EVENT)
          .find(filter)
          .limit(SOMEDAY_EVENTS_LIMIT)
          .sort({ startDate: 1 })
          .toArray();
        return response;
      } else {
        const response: Schema_Event[] = await mongoService.db
          .collection(Collections.EVENT)
          .find(filter)
          .toArray();
        return response;
      }
    } catch (e) {
      logger.error(e);
      return new BaseError("Read Failed", e, 500, true);
    }
  }

  async readById(
    userId: string,
    eventId: string
  ): Promise<Schema_Event | BaseError> {
    try {
      const filter = {
        _id: mongoService.objectId(eventId),
        user: userId,
      };
      const event: Schema_Event = await mongoService.db
        .collection(Collections.EVENT)
        .findOne(filter);

      if (event === null) {
        return new BaseError(
          "Event not found",
          `Tried with user: ${userId} and _id: ${eventId}`,
          Status.NOT_FOUND,
          true
        );
      }

      return event;
    } catch (e: any) {
      logger.error(e);
      return new BaseError("Read Failed", e, 500, true);
    }
  }

  async updateById(
    userId: string,
    eventId: string,
    event: Schema_Event
  ): Promise<Schema_Event | BaseError> {
    try {
      if ("_id" in event) {
        delete event._id; // mongo doesn't allow changing this field directly
      }

      /* Part I: Gcal */
      const updateGcal = !event.isSomeday;
      if (updateGcal) {
        const wasSomedayEvent = event.gEventId === undefined;

        if (wasSomedayEvent) {
          const gEvent = await this._createGcalEvent(userId, event);
          event["gEventId"] = gEvent.id;
        } else {
          const gEvent = MapEvent.toGcal(event);
          const gcal = await getGcal(userId);
          await gcalService.updateEvent(gcal, event.gEventId, gEvent);
        }
      }

      /* Part II: Compass */
      const response = await mongoService.db
        .collection(Collections.EVENT)
        .findOneAndUpdate(
          { _id: mongoService.objectId(eventId), user: userId },
          { $set: event },
          { returnDocument: "after" }
        );

      if (response.value === null || response.idUpdates === 0) {
        logger.error("Update failed");
        return new BaseError(
          "Update Failed",
          "Ensure id is correct",
          400,
          true
        );
      }
      const updatedEvent = response.value as Schema_Event;

      return updatedEvent;
    } catch (e) {
      logger.error(e);
      return new BaseError("Update Failed", e, 500, true);
    }
  }

  async updateMany(userId: string, events: Schema_Event[]) {
    return "not done implementing this operation";
  }

  /**********
   * Helpers
   *  (that have too many dependencies
   *  to put in event.service.helpers)
   *********/

  _createGcalEvent = async (userId: string, event: Schema_Event) => {
    const _gEvent = MapEvent.toGcal(event);

    const gEventWithOrigin: gSchema$Event = {
      ..._gEvent,
      // capture the fact that this event originated from Compass,
      // so we dont attempt to re-add it during the next gcal sync
      extendedProperties: {
        private: {
          origin: Origin.COMPASS,
        },
      },
    };

    const gcal = await getGcal(userId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const gEvent = await gcalService.createEvent(gcal, gEventWithOrigin);

    return gEvent;
  };
}

export default new EventService();
