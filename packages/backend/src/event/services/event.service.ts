import { InsertManyResult } from "mongodb";

import { Result_Import_Gcal } from "@core/types/sync.types";
import { MapEvent } from "@core/mappers/map.event";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  Schema_Event,
  Query_Event,
  Params_DeleteMany,
  Result_DeleteMany,
} from "@core/types/event.types";

import {
  gCalendar,
  gParamsEventsList,
  gSchema$Event,
} from "../../../declarations";

import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import mongoService from "@backend/common/services/mongo.service";
import { Logger } from "@backend/common/logger/common.logger";
import { Collections } from "@backend/common/constants/collections";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { yearsAgo } from "@backend/common/helpers/common.helpers";
import { getGcal } from "@backend/auth/services/google.auth.service";

import { getReadAllFilter } from "./event.service.helpers";
import { Origin } from "@core/core.constants";

const logger = Logger("app:event.service");

class EventService {
  async create(
    userId: string,
    event: Schema_Event
  ): Promise<Schema_Event | BaseError> {
    try {
      /* Save to Gcal */
      const _gEvent = MapEvent.toGcal(userId, event);
      const gEventWithOrigin: gSchema$Event = {
        ..._gEvent,
        // capture the fact that this event originated from Compass,
        // so we dont attempt to re-add it during the next gcal sync
        extendedProperties: {
          private: {
            origin: Origin.Compass,
          },
        },
      };
      const gcal = await getGcal(userId);
      const gEvent = await gcalService.createEvent(gcal, gEventWithOrigin);

      /* Save to Compass */
      const eventWithGcalId = {
        ...event,
        user: userId,
        gEventId: gEvent.id,
      };

      const response = await mongoService.db
        .collection(Collections.EVENT)
        .insertOne(eventWithGcalId);

      if ("acknowledged" in response) {
        const eventWithId: Schema_Event = {
          ...eventWithGcalId,
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

  /* Deletes all of a user's events */
  async deleteAllByUser(userId: string) {
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({ user: userId });
    return response;
  }

  async deleteById(userId: string, id: string) {
    // TODO refactor this so it doesn't require so many calls

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
      const { gEventId } = event;

      if (gEventId === undefined) {
        return new BaseError(
          "Delete Failed",
          `GoogleEvent id cannot be null`,
          Status.BAD_REQUEST,
          true
        );
      }

      const response = await mongoService.db
        .collection(Collections.EVENT)
        .deleteOne(filter);

      const gcal = await getGcal(userId);
      // no await because gcal doesnt return much of a response,
      // so there's no use in waiting for it to finish
      gcalService.deleteEvent(gcal, gEventId);

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

      const numYears = 2;
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
          const cEvents = MapEvent.toCompass(userId, gEvents.data.items);
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
      const response: Schema_Event[] = await mongoService.db
        .collection(Collections.EVENT)
        .find(filter)
        .toArray();
      return response;
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

      const gEvent = MapEvent.toGcal(userId, updatedEvent);
      const gcal = await getGcal(userId);
      const gEventId = updatedEvent.gEventId;
      if (gEventId === undefined) {
        return new BaseError(
          "Update Failed",
          "no gEventId",
          Status.INTERNAL_SERVER,
          true
        );
      }
      //TODO error-handle this and/or extract from this and turn into its own saga,
      // in order to remove extra work that delays response to user
      const gcalRes = await gcalService.updateEvent(gcal, gEventId, gEvent);

      return updatedEvent;
    } catch (e) {
      logger.error(e);
      return new BaseError("Update Failed", e, 500, true);
    }
  }

  async updateMany(userId: string, events: Schema_Event[]) {
    return "not done implementing this operation";

    const testId = `events.$[_id]`;
    const updateResult = mongoService.db
      .collection(Collections.EVENT)
      .updateMany(
        // { user: userId, _id: mongoService.objectId("cEvents.$[_id]") },
        { user: userId, _id: mongoService.objectId(`events.${[_id]}`) },
        // { user: "testUser1", gEventId: "events.$[gEventId]" },
        { $set: events },
        { upsert: true }
      );
    return updateResult;
  }
}

export default new EventService();
