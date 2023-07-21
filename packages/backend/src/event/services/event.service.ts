import {
  Origin,
  Priorities,
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import {
  Schema_Event,
  Query_Event,
  Params_DeleteMany,
  Result_DeleteMany,
  Payload_Order,
} from "@core/types/event.types";
import { getCurrentWeekRangeDates } from "@core/util/date.utils";
import { Logger } from "@core/logger/winston.logger";
import { Collections } from "@backend/common/constants/collections";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  EventError,
  GenericError,
} from "@backend/common/constants/error.constants";

import {
  assembleRecurringEvents,
  getCreateParams,
  getReadAllFilter,
} from "./event.service.util";
import { reorderEvents } from "../queries/event.queries";

const logger = Logger("app:event.service");

class EventService {
  create = async (userId: string, event: Schema_Event) => {
    const { _event, isRecurring, syncToGcal } = getCreateParams(userId, event);

    // must update gcal's data before Compass's
    //  (see Sync docs for explanation)
    if (syncToGcal) {
      const gEvent = await this._createGcalEvent(userId, event);
      _event.gEventId = gEvent.id as string;
    }

    /* Save to Compass */
    let eventId: string;

    if (isRecurring) {
      eventId = await this._createRecurringEvents(_event);
    } else {
      const response = await mongoService.db
        .collection(Collections.EVENT)
        .insertOne(_event);

      eventId = response.insertedId.toString();
    }

    const eventWithId: Schema_Event = {
      ..._event,
      _id: eventId,
    };
    return eventWithId;
  };

  createDefaultSomeday = async (userId: string) => {
    const { startDate, endDate } = getCurrentWeekRangeDates();

    const defaultSomedayEvent: Schema_Event = {
      isAllDay: false,
      isSomeday: true,
      priority: Priorities.UNASSIGNED,
      origin: Origin.COMPASS,
      startDate,
      endDate,
      title: "⭐ That one thing...",
      description: `... that you wanna do this week, but aren't sure when.\
        \nKeep it here for safekeeping, then drag it over to the calendar once you're ready to commit times.\
        \n\nThese sidebar events are:\
        \n-filtered by the calendar week you're on\
        \n-limited to ${SOMEDAY_WEEKLY_LIMIT} per week`,
    };

    return await this.create(userId, defaultSomedayEvent);
  };

  createMany = async (events: Schema_Event[]) => {
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
  };

  /* 
  Deletes all of a user's events 
  REMINDER: this should only delete a user's *Compass* events --
            don't ever delete their events in gcal or any other 3rd party calendar
  */
  deleteAllByUser = async (userId: string) => {
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({ user: userId });
    return response;
  };

  deleteById = async (userId: string, id: string) => {
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
  };

  deleteMany = async (
    userId: string,
    params: Params_DeleteMany
  ): Promise<Result_DeleteMany> => {
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
  };

  deleteByIntegration = async (integration: "google", userId: string) => {
    if (integration !== "google") {
      error(
        GenericError.NotImplemented,
        `Failed to delete events for integration`
      );
    }

    const key = "gEventId";
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({
        user: userId,
        isSomeday: false,
        [key]: { $exists: true },
      });
    return response;
  };

  readAll = async (
    userId: string,
    query: Query_Event
  ): Promise<Schema_Event[] | BaseError> => {
    const filter = getReadAllFilter(userId, query);

    if (query.someday) {
      const response = (await mongoService.db
        .collection(Collections.EVENT)
        .find(filter)
        .limit(SOMEDAY_WEEKLY_LIMIT + SOMEDAY_MONTHLY_LIMIT)
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
  };

  readById = async (userId: string, eventId: string) => {
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
  };

  reorder = async (userId: string, order: Payload_Order[]) => {
    if (order.length <= 0) {
      throw error(GenericError.BadRequest, "No events to reorder");
    }

    const result = await reorderEvents(userId, order);

    return result;
  };

  updateById = async (userId: string, eventId: string, event: Schema_Event) => {
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
      // force page refresh, which will let Redux use latest ids
      throw error(EventError.NoMatchingEvent, "Prompt Redux refresh");
    }
    const updatedEvent = response.value as unknown as Schema_Event;

    return updatedEvent;
  };

  updateMany = async (userId: string, events: Schema_Event[]) => {
    logger.error("not done implementing this operation");
    console.log(userId, events);
    return Promise.resolve(["not implemented"]);
  };

  /**********
   * Helpers
   *  (that have too many dependencies
   *  to put in event.service.util)
   *********/

  _createGcalEvent = async (userId: string, event: Schema_Event) => {
    const _gEvent = MapEvent.toGcal(event);

    const gcal = await getGcalClient(userId);
    const gEvent = await gcalService.createEvent(gcal, _gEvent);

    return gEvent;
  };

  _createRecurringEvents = async (event: Schema_Event) => {
    const recurringEvents = assembleRecurringEvents(event);

    const { insertedIds } = await mongoService.db
      .collection(Collections.EVENT)
      .insertMany(recurringEvents);

    if (insertedIds[0] === undefined) {
      throw error(GenericError.BadRequest, "Failed to create recurring events");
    }

    const eventId = insertedIds[0].toString();
    return eventId;
  };
}

export default new EventService();
