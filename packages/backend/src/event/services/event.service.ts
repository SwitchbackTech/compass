import { ClientSession, Document, Filter, ObjectId, WithId } from "mongodb";
import {
  Origin,
  Priorities,
  RRULE,
  RRULE_COUNT_MONTHS,
  RRULE_COUNT_WEEKS,
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { MapEvent } from "@core/mappers/map.event";
import {
  CalendarProvider,
  CompassEventStatus,
  CompassThisEvent,
  EventUpdatePayload,
  EventUpdateSchema,
  Params_DeleteMany,
  Payload_Order,
  Query_Event,
  RecurringEventUpdateScope,
  Result_DeleteMany,
  Schema_Event,
  Schema_Event_Core,
  WithCompassId,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { getCurrentRangeDates } from "@core/util/date/date.util";
import {
  isExistingInstance,
  parseCompassEventDate,
} from "@core/util/event/event.util";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import { EventError } from "@backend/common/errors/event/event.errors";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { CompassEventRRule } from "@backend/event/classes/compass.event.rrule";
import { reorderEvents } from "@backend/event/queries/event.queries";
import { getReadAllFilter } from "@backend/event/services/event.service.util";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

class EventService {
  createDefaultSomedays = async (userId: string) => {
    const { week, month } = getCurrentRangeDates();

    const defaultWeekly: Schema_Event_Core = {
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
      user: userId,
    };

    const weeklyRepeat: Schema_Event_Core = {
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
      user: userId,
    };

    const monthlyRepeat: Schema_Event_Core = {
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
      user: userId,
    };

    return CompassSyncProcessor.processEvents(
      [weeklyRepeat, monthlyRepeat, defaultWeekly].map((e) => {
        const eventId = new ObjectId().toString();

        return {
          eventId,
          userId,
          payload: { ...e, _id: eventId } as CompassThisEvent["payload"],
          status: CompassEventStatus.CONFIRMED,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        };
      }),
    );
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

  deleteMany = async (
    userId: string,
    params: Params_DeleteMany,
  ): Promise<Result_DeleteMany> => {
    const errors = [];
    const response = await mongoService.db
      .collection(Collections.EVENT)
      .deleteMany({ user: userId, [params.key]: { $in: params.ids } });

    if (response.deletedCount !== params.ids.length) {
      errors.push(
        `Only deleted ${response.deletedCount}/${params.ids.length} events`,
      );
    }
    const result = { deletedCount: response.deletedCount, errors: errors };
    return result;
  };

  deleteByIntegration = async (integration: "google", userId: string) => {
    if (integration !== "google") {
      error(
        GenericError.NotImplemented,
        `Failed to delete events for integration`,
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
    query: Query_Event,
  ): Promise<Schema_Event_Core[] | BaseError> => {
    const filter = getReadAllFilter(userId, query) as Filter<Document>;

    let events: Array<WithId<Omit<Schema_Event, "_id">>>;

    if (query.someday) {
      events = await mongoService.event
        .find(filter)
        .limit(SOMEDAY_WEEKLY_LIMIT + SOMEDAY_MONTHLY_LIMIT)
        .sort({ startDate: 1 })
        .toArray();
    } else {
      events = await mongoService.event.find(filter).toArray();
    }

    const baseEventIds = events
      .filter(isExistingInstance)
      .map((e) => new ObjectId(e.recurrence?.eventId));

    const baseEvents = await mongoService.event
      .find({ user: userId, _id: { $in: baseEventIds } })
      .toArray();

    return events.map((event) => {
      if (isExistingInstance(event)) {
        const baseEvent = baseEvents.find(
          ({ _id }) => _id.toString() === event.recurrence?.eventId,
        );

        return {
          ...event,
          _id: event._id.toString(),
          recurrence: {
            eventId: event.recurrence?.eventId,
            rule: baseEvent?.recurrence?.rule,
          },
        } as Schema_Event_Core;
      }

      return { ...event, _id: event._id.toString() } as Schema_Event_Core;
    });
  };

  readById = async (userId: string, eventId: string) => {
    const filter = {
      _id: mongoService.objectId(eventId),
      user: userId,
    };

    const event = await mongoService.event.findOne(filter);

    if (event === null) {
      throw new BaseError(
        "Event not found",
        `Tried with user: ${userId} and _id: ${eventId}`,
        Status.NOT_FOUND,
        true,
      );
    }

    const isInstance = isExistingInstance(event);

    if (isInstance) {
      const baseEvent = await mongoService.event.findOne({
        user: userId,
        _id: new ObjectId(event.recurrence?.eventId),
      });

      event.recurrence = {
        eventId: event.recurrence?.eventId,
        rule: baseEvent?.recurrence?.rule,
      };
    }

    return { ...event, _id: event._id.toString() };
  };

  reorder = async (userId: string, order: Payload_Order[]) => {
    if (order.length <= 0) {
      throw error(GenericError.BadRequest, "No events to reorder");
    }

    const result = await reorderEvents(userId, order);

    return result;
  };
}

const eventService = new EventService();

export default eventService;

/**********
 * Helpers
 *  (that have too many dependencies
 *  to put in event.service.util)
 *********/

export const _createCompassEvent = async (
  _event: WithId<Omit<Schema_Event, "_id">> & { user: string },
  provider: CalendarProvider,
  rrule?: CompassEventRRule | null,
  session?: ClientSession,
): Promise<WithCompassId<Omit<Schema_Event, "_id">>> => {
  const updatedAt = new Date();
  const { isSomeday, _id, user, recurrence } = _event;

  const calData = isSomeday
    ? MapEvent.removeIdentifyingData(_event)
    : MapEvent.toProviderData(_event, provider);

  const recurrenceData = recurrence ? { recurrence } : {};

  const event = isSomeday
    ? { ...calData, _id, user, ...recurrenceData, updatedAt }
    : Object.assign(_event, calData, { updatedAt });

  const instances = isSomeday ? [] : (rrule?.instances(provider) ?? []);

  const baseEvent = await mongoService.event.findOneAndUpdate(
    { _id: event._id, user: event.user },
    { $set: event },
    { upsert: true, session, returnDocument: "after" },
  );

  if (!baseEvent?._id) {
    throw error(GenericError.NotSure, "Event creation failed");
  }

  if (instances.length > 0) {
    const bulkUpsert = mongoService.event.initializeUnorderedBulkOp();

    instances.forEach((event) => {
      bulkUpsert.find({ _id: event._id, user: event.user }).upsert().update({
        $set: event,
      });
    });

    await bulkUpsert.execute({ session });
  }

  return { ...baseEvent, _id: baseEvent._id.toString() };
};

export const _updateCompassEvent = async (
  _event: WithId<Omit<Schema_Event, "_id">> & { user: string },
  session?: ClientSession,
): Promise<WithCompassId<Omit<Schema_Event, "_id">>> => {
  const updatedAt = new Date();
  const event = Object.assign({}, _event, { updatedAt });

  if (event.recurrence === null) delete event.recurrence;

  const cEvent = await mongoService.event.findOneAndReplace(
    { _id: event._id, user: event.user },
    event,
    { session, returnDocument: "after" },
  );

  if (!cEvent) {
    throw error(GenericError.NotSure, "updated compass event not found");
  }

  return { ...cEvent, _id: cEvent._id.toString() };
};

export const _updateCompassSeries = async (
  baseEvent: WithId<Omit<Schema_Event, "_id">> & { user: string },
  session?: ClientSession,
): Promise<WithCompassId<Omit<Schema_Event, "_id">>> => {
  const baseId = baseEvent._id;
  const user = baseEvent.user;
  const updatedAt = new Date();
  const changes: EventUpdatePayload = EventUpdateSchema.parse(baseEvent);
  const update = Object.assign(changes, { updatedAt }) as Schema_Event;

  delete update.startDate;
  delete update.endDate;
  delete (update as Schema_Event).recurrence;

  await mongoService.event.updateMany(
    {
      $or: [
        { _id: baseId, user },
        { "recurrence.eventId": baseId.toString(), user },
      ],
    },
    { $set: update },
    { session },
  );

  return { ...baseEvent, ...update, _id: baseId.toString() };
};

export const _deleteSingleCompassEvent = async (
  _event: WithId<Omit<Schema_Event, "_id">> & { user: string },
  session?: ClientSession,
): Promise<WithCompassId<Omit<Schema_Event, "_id">>> => {
  const userId = _event.user;

  const event = await mongoService.event.findOneAndDelete(
    { _id: _event._id, user: userId },
    { session },
  );

  if (!event) {
    throw error(GenericError.NotSure, "deleted compass event not returned");
  }

  return { ...event, _id: event._id.toString() };
};

export const _deleteInstances = async (
  userId: string,
  baseId: string,
  filter: Filter<Omit<Schema_Event, "_id">> = {},
  session?: ClientSession,
) => {
  if (typeof baseId !== "string") {
    throw new Error("Invalid baseId");
  }

  const response = await mongoService.event.deleteMany(
    {
      ...filter,
      user: userId,
      _id: { $ne: new ObjectId(baseId) },
      "recurrence.eventId": baseId,
    },
    { session },
  );

  return response;
};

export const _deleteSeries = async (
  userId: string,
  baseId: string,
  session?: ClientSession,
) => {
  if (typeof baseId !== "string") {
    throw new Error("Invalid baseId");
  }

  const response = await mongoService.event.deleteMany(
    {
      $or: [
        { _id: new ObjectId(baseId), user: userId },
        { "recurrence.eventId": baseId, user: userId },
      ],
    },
    { session },
  );

  return response;
};

export const _deleteInstancesAfterUntil = async (
  userId: string,
  baseId: string,
  until: Date,
  session?: ClientSession,
) => {
  if (typeof baseId !== "string") throw new Error("Invalid baseId");
  if (!(until instanceof Date)) throw new Error("Invalid until date");

  const filter: Filter<Omit<Schema_Event, "_id">> = {
    user: userId,
    _id: { $ne: new ObjectId(baseId) },
    "recurrence.eventId": baseId,
  };

  const allInstances = await mongoService.event
    .find(filter, { session, projection: { _id: 1, startDate: 1 } })
    .toArray();

  const instancesToDelete = allInstances.filter(({ startDate }) => {
    const date = parseCompassEventDate(startDate!);

    return date.isAfter(until);
  });

  const response = await mongoService.event.deleteMany(
    {
      ...filter,
      _id: { $in: instancesToDelete.map(({ _id }) => _id) },
    },
    { session },
  );

  return response;
};

export const _getGcal = async (
  userId: string,
  eventId: string,
  calendarId?: string,
) => {
  const gcal = await getGcalClient(userId);
  const gEvent = await gcalService.getEvent(gcal, eventId, calendarId);

  return gEvent;
};

export const _createGcal = async (userId: string, event: Schema_Event_Core) => {
  const _gEvent = MapEvent.toGcal(event);

  const gcal = await getGcalClient(userId);
  const gEvent = await gcalService.createEvent(gcal, _gEvent);

  return gEvent;
};

export const _updateGcal = async (
  userId: string,
  event: Schema_Event_Core,
  extras?: Pick<gSchema$Event, "status">,
) => {
  const gEvent = MapEvent.toGcal(event, extras);
  const gcal = await getGcalClient(userId);

  if (!event.gEventId) {
    throw error(
      EventError.MissingProperty,
      "cannot update gcal event without id",
    );
  }

  await gcalService.updateEvent(gcal, event.gEventId, gEvent);

  return event;
};

export const _upsertGcal = async (
  userId: string,
  event: Schema_Event_Core,
  extras?: Pick<gSchema$Event, "status" | "recurrence">,
) => {
  const wasSomedayEvent = event.gEventId === undefined;

  if (wasSomedayEvent) {
    const gEvent = await _createGcal(userId, event);
    event.gEventId = gEvent.id as string;
  } else {
    await _updateGcal(userId, event, extras);
  }

  return event;
};

export const _deleteGcal = async (
  userId: string,
  gEventId: string,
): Promise<boolean> => {
  const gcal = await getGcalClient(userId);

  if (!gEventId) {
    throw error(GenericError.BadRequest, "cannot delete gcal event without id");
  }

  const response = await gcalService.deleteEvent(gcal, gEventId);

  return response.status < 300;
};
