import { InsertManyResult } from "mongodb";

import { ImportResult$GCal } from "@compass/core/src/types/sync.types";
import { GCAL_PRIMARY } from "@common/constants/backend.constants";
import mongoService from "@common/services/mongo.service";
import { Logger } from "@common/logger/common.logger";
import { Event$NoId, Event, Query$Event } from "@core/types/event.types";
import { BaseError } from "@common/errors/errors.base";
import { Status } from "@common/errors/status.codes";
import { Collections } from "@common/constants/collections";
import gcalService from "@common/services/gcal.service";
import { getGcal } from "@auth/services/google.auth.service";
import { yearsAgo } from "@common/helpers/common.helpers";
import { GcalMapper } from "@common/helpers/map.gcal";

import {
  gCalendar,
  gParamsEventsList,
  gSchema$Event,
  gSchema$Events,
} from "../../../declarations";
import { getReadAllFilter } from "./event.service.helpers";

const logger = Logger("app:event.service");

class EventService {
  async create(userId: string, event: Event$NoId): Promise<Event | BaseError> {
    try {
      const _gEvent = GcalMapper.toGcal(userId, event);
      const gcal = await getGcal(userId);
      const gEvent = await gcalService.createEvent(gcal, _gEvent);

      const eventWithGcalId = { ...event, gEventId: gEvent.id };

      const response = await mongoService.db
        .collection(Collections.EVENT)
        .insertOne(eventWithGcalId);

      if ("acknowledged" in response) {
        const dto: Event = {
          ...eventWithGcalId,
          _id: response.insertedId.toString(),
        };
        return dto;
      } else {
        return new BaseError("Create Failed", response.toString(), 500, true);
      }
    } catch (e) {
      // TODO catch BulkWriteError
      logger.error(e);
      return new BaseError("Create Failed", e.message, 500, true);
    }
  }

  async createMany(
    userId: string,
    data: Event$NoId[]
  ): Promise<InsertManyResult | BaseError> {
    //TODO verify userId exists first (?)

    const response = await mongoService.db
      .collection(Collections.EVENT)
      .insertMany(data);

    if ("insertedCount" in response && response.insertedCount > 0) {
      return response;
    } else {
      return new BaseError("Create Failed", response.toString(), 500, true);
    }
  }

  async deleteById(userId: string, id: string) {
    // TODO refactor this so it doesn't require so many calls
    try {
      const filter = { _id: mongoService.objectId(id), user: userId };

      //get event so you can see the googleId
      const event: Event$NoId = await mongoService.db
        .collection(Collections.EVENT)
        .findOne(filter);

      if (!event) {
        return new BaseError(
          "Delete Failed",
          `Could not find eventt with id: ${id}`,
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
      return new BaseError("Delete Failed", e, 500, true);
    }
  }

  async deleteMany(userId: string) {
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({ user: userId });
    return response;
  }

  async import(userId: string, gcal: gCalendar): Promise<ImportResult$GCal> {
    try {
      let nextPageToken = undefined;
      let nextSyncToken = undefined;
      let total = 0;

      // always fetches once, then continues until
      // there are no more events
      logger.info(`Importing Google events for user: ${userId}`);

      const twoYearsAgo = yearsAgo(2);
      do {
        const params: gParamsEventsList = {
          calendarId: GCAL_PRIMARY,
          timeMin: twoYearsAgo,
          pageToken: nextPageToken,
        };
        const gEvents = await gcalService.getEvents(gcal, params);
        if (gEvents.data.items) total += gEvents.data.items.length;

        if (gEvents.data.items) {
          const cEvents = GcalMapper.toCompass(userId, gEvents.data.items);
          const response = await this.createMany(userId, cEvents);
          //confirm acknowledged and that insertedCount = gEvents.legnth

          nextPageToken = gEvents.data.nextPageToken;
          nextSyncToken = gEvents.data.nextSyncToken;
        } else {
          logger.error("unexpected empty values in events");
        }
      } while (nextPageToken !== undefined);

      const summary = {
        total: total,
        nextSyncToken: nextSyncToken,
        errors: [],
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

  async readById(userId: string, eventId: string): Promise<Event | BaseError> {
    try {
      const filter = {
        _id: mongoService.objectId(eventId),
        user: userId,
      };
      const event: Event = await mongoService.db
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

  async readAll(
    userId: string,
    query: Query$Event
  ): Promise<Event[] | BaseError> {
    try {
      const filter = getReadAllFilter(userId, query);
      const response: Event[] = await mongoService.db
        .collection(Collections.EVENT)
        .find(filter)
        .toArray();
      return response;
    } catch (e) {
      logger.error(e);
      return new BaseError("Read Failed", e, 500, true);
    }
  }

  async updateById(
    userId: string,
    eventId: string,
    event: Event$NoId
  ): Promise<Event | BaseError> {
    try {
      const response = await mongoService.db
        .collection(Collections.EVENT)
        .findOneAndUpdate(
          { _id: mongoService.objectId(eventId), user: userId },
          { $set: event },
          { returnDocument: "after" }
        );

      if (response.value === null || response.ok === 0) {
        logger.error("Update failed");
        return new BaseError(
          "Update Failed",
          "Ensure id is correct",
          400,
          true
        );
      }
      const updatedEvent = response.value;

      const gEvent = GcalMapper.toGcal(userId, updatedEvent);
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
      gcalService.updateEvent(gcal, gEventId, gEvent);

      return updatedEvent;
    } catch (e) {
      logger.error(e);
      return new BaseError("Update Failed", e, 500, true);
    }
  }
}

export default new EventService();
