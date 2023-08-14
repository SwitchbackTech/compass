import {
  Origin,
  Priorities,
  RRULE,
  RRULE_COUNT_MONTHS,
  RRULE_COUNT_WEEKS,
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
import { getCurrentRangeDates } from "@core/util/date.utils";
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
  assembleInstances,
  getCreateParams,
  getDeleteByIdFilter,
  getReadAllFilter,
  getUpdateAction,
} from "./event.service.util";
import {
  deleteInstances,
  reorderEvents,
  updateEvent,
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
      eventId = await _createInstances(_event);
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

    if (isRecurring) {
      return {
        ...eventWithId,
        recurrence: { eventId, rule: _event.recurrence?.rule },
      };
    }

    return eventWithId;
  };

  createDefaultSomedays = async (userId: string) => {
    const { week, month } = getCurrentRangeDates();

    const defaultWeekly: Schema_Event = {
      title: "⭐ That one thing...",
      isAllDay: false,
      isSomeday: true,
      startDate: week.startDate,
      endDate: week.endDate,
      priority: Priorities.UNASSIGNED,
      origin: Origin.COMPASS,
      description: `... that you wanna do this week, but aren't sure when.\
        \nKeep it here for safekeeping, then drag it over to the calendar once you're ready to commit times.\
        \n\nThese sidebar events are:\
        \n-filtered by the calendar week you're on\
        \n-limited to ${SOMEDAY_WEEKLY_LIMIT} per week`,
    };

    const weeklyRepeat: Schema_Event = {
      title: "🪴 Water plants",
      isAllDay: false,
      isSomeday: true,
      startDate: week.startDate,
      endDate: week.endDate,
      origin: Origin.COMPASS,
      priority: Priorities.SELF,
      description: `This event happens every week.\
        \n\nRather than repeating forever, however, it'll stop after ${
          RRULE_COUNT_WEEKS / RRULE_COUNT_MONTHS
        } months.\
        \n\nThis encourages frequent re-prioritizing, rather than running on autopilot indefinitely.`,
      recurrence: {
        rule: [RRULE.WEEK],
      },
    };

    const monthlyRepeat: Schema_Event = {
      isAllDay: false,
      isSomeday: true,
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      startDate: month.startDate,
      endDate: month.endDate,
      title: "🎲 Schedule game night",
      recurrence: {
        rule: [RRULE.MONTH],
      },
      description: `This one repeats once a month for ${RRULE_COUNT_MONTHS} months`,
    };

    await this.create(userId, weeklyRepeat);
    await this.create(userId, monthlyRepeat);
    return await this.create(userId, defaultWeekly);
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
    const updateGcal = !event.isSomeday;
    const action = getUpdateAction(event, query);
    const _baseEvent = updateGcal ? await _updateGcal(userId, event) : event;

    const _event = { ..._baseEvent, updatedAt: new Date() };
    const baseId = _event.recurrence?.eventId as string;

    switch (action) {
      case "CREATE_INSTANCES": {
        await _createInstances(_event, eventId);

        const eventWithRecur = {
          ..._event,
          recurrence: {
            eventId,
            rule: _event?.recurrence?.rule,
          },
        };
        await updateEvent(userId, eventId, eventWithRecur);
        return _event;
        break;
      }
      case "DELETE_INSTANCES_ALL": {
        const eventWithoutRecur = _removeRecurrence(_event);

        await updateEvent(userId, eventId, eventWithoutRecur);
        await deleteInstances(userId, baseId);

        return eventWithoutRecur;
        break;
      }
      case "UPDATE": {
        await updateEvent(userId, eventId, _event);
        return _event;
        break;
      }
      case "UPDATE_ALL": {
        await deleteInstances(userId, baseId);
        await updateEvent(userId, baseId, _event);
        await _createInstances(_event, eventId);

        return _event;
        break;
      }
      default: {
        return error(GenericError.DeveloperError, "Failed to update event");
        break;
      }
    }
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

const _createInstances = async (event: Schema_Event, baseId?: string) => {
  const instances = assembleInstances(event, baseId);

  const { insertedIds } = await mongoService.db
    .collection(Collections.EVENT)
    .insertMany(instances);

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

const _removeRecurrence = (event: Schema_Event) => {
  const eventWithoutRecur = { ...event };
  delete eventWithoutRecur.recurrence;

  return eventWithoutRecur;
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
