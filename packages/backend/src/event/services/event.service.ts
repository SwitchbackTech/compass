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
  Query_Event_Update,
} from "@core/types/event.types";
import { getCurrentWeekRangeDates } from "@core/util/date.utils";
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
  assembleEventAndRecurrences,
  getCreateParams,
  getDeleteByIdFilter,
  getReadAllFilter,
} from "./event.service.util";
import {
  deleteRecurringEvents,
  reorderEvents,
  updateEvent,
  updateFutureInstances,
} from "../queries/event.queries";

class EventService {
  create = async (userId: string, event: Schema_Event) => {
    const { _event, isRecurring, syncToGcal } = getCreateParams(userId, event);

    //  must update gcal's data before Compass's
    //  (see Sync docs for explanation)
    if (syncToGcal) {
      const gEvent = await _createGcalEvent(userId, event);
      _event.gEventId = gEvent.id as string;
    }

    /* Save to Compass */
    let eventId: string;

    if (isRecurring) {
      eventId = await _createRecurringEvents(_event);
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
    if (id === "undefined") {
      throw error(EventError.NoMatchingEvent, "Failed to delete event");
    }

    const filter = { _id: mongoService.objectId(id), user: userId };

    const event = await mongoService.db
      .collection(Collections.EVENT)
      .findOne(filter);

    if (!event) {
      throw error(EventError.NoMatchingEvent, "Failed to delete event");
    }

    const deleteFromGcal = !event["isSomeday"];
    const _event = event as unknown as Schema_Event;
    const gEventId = _event.gEventId;

    if (deleteFromGcal) {
      if (gEventId === undefined) {
        throw error(
          EventError.NoMatchingEvent,
          "Failed to delete Google event"
        );
      }
      const gcal = await getGcalClient(userId);
      await gcalService.deleteEvent(gcal, gEventId);
    }

    const response = await _deleteFromCompass(_event);
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

  updateById = async (
    userId: string,
    eventId: string,
    event: Schema_Event,
    query: Query_Event_Update
  ) => {
    const shouldUpdateGcal = !event.isSomeday;
    const _baseEvent = shouldUpdateGcal
      ? await _updateGcal(userId, event)
      : event;

    const _event = { ..._baseEvent, updatedAt: new Date() };

    //++ refactor out conditionals
    if (query?.applyTo === "future") {
      await updateEvent(userId, _event, eventId);
      await updateFutureInstances(userId, _event);
    } else if (query?.applyTo === "all") {
      const hasInstances = event?.recurrence?.eventId !== undefined;
      if (hasInstances) {
        await deleteRecurringEvents(
          userId,
          event.recurrence?.eventId as string
        );

        const shouldRemoveRecur =
          event.recurrence?.eventId && event.recurrence.rule === null;
        if (shouldRemoveRecur) {
          const eventWithoutRecur = { ...event };
          delete eventWithoutRecur.recurrence;
          const newBaseEvent = await this.create(userId, eventWithoutRecur);
          return newBaseEvent;
        }
      } else {
        await this.deleteById(userId, eventId);
      }

      const newBaseEvent = await this.create(userId, _event);
      return newBaseEvent;
    } else {
      await updateEvent(userId, _event, eventId);
    }

    return _event;
  };
}

export default new EventService();

/**********
 * Helpers
 *  (that have too many dependencies
 *  to put in event.service.util)
 *********/

const _createGcalEvent = async (userId: string, event: Schema_Event) => {
  const _gEvent = MapEvent.toGcal(event);

  const gcal = await getGcalClient(userId);
  const gEvent = await gcalService.createEvent(gcal, _gEvent);

  return gEvent;
};

const _createRecurringEvents = async (event: Schema_Event) => {
  const recurringEvents = assembleEventAndRecurrences(event);

  const { insertedIds } = await mongoService.db
    .collection(Collections.EVENT)
    .insertMany(recurringEvents);

  if (insertedIds[0] === undefined) {
    throw error(GenericError.BadRequest, "Failed to create recurring events");
  }

  const eventId = insertedIds[0].toString();
  return eventId;
};

const _deleteFromCompass = async (event: Schema_Event) => {
  const isRecurring = event.recurrence !== undefined;

  if (!event.user || !event._id) {
    throw error(GenericError.BadRequest, "Failed to delete event(s)");
  }

  const filter = getDeleteByIdFilter(event);

  const response = isRecurring
    ? await mongoService.db.collection(Collections.EVENT).deleteMany(filter)
    : await mongoService.db.collection(Collections.EVENT).deleteOne(filter);

  return response;
};

const _updateGcal = async (userId: string, event: Schema_Event) => {
  const wasSomedayEvent = event.gEventId === undefined;

  if (wasSomedayEvent) {
    const gEvent = await _createGcalEvent(userId, event);
    event.gEventId = gEvent.id as string;
  } else {
    const gEvent = MapEvent.toGcal(event);
    const gcal = await getGcalClient(userId);
    await gcalService.updateEvent(gcal, event.gEventId as string, gEvent);
  }

  return event;
};

//++
const _updateRecurringEvents = async (userId: string, event: Schema_Event) => {
  const baseId = event.recurrence?.eventId;
  const hasInstances = baseId !== undefined;

  if (hasInstances) {
    await deleteRecurringEvents(userId, baseId);
  } else {
    await mongoService.db.collection(Collections.EVENT).deleteOne({
      user: userId,
      _id: mongoService.objectId(event._id as string),
    });
  }

  const response = await _createRecurringEvents(event);
  return response;
};
