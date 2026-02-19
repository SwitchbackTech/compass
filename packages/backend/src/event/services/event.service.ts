import type { GaxiosError } from "gaxios";
import { ClientSession, Document, Filter, ObjectId, WithId } from "mongodb";
import {
  SOMEDAY_MONTHLY_LIMIT,
  SOMEDAY_WEEKLY_LIMIT,
} from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { MapEvent } from "@core/mappers/map.event";
import {
  CalendarProvider,
  EventUpdatePayload,
  EventUpdateSchema,
  Params_DeleteMany,
  Payload_Order,
  Query_Event,
  Result_DeleteMany,
  Schema_Event,
  Schema_Event_Core,
  WithCompassId,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { IDSchema } from "@core/types/type.utils";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { isInstance, parseCompassEventDate } from "@core/util/event/event.util";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { Collections } from "@backend/common/constants/collections";
import { EventError } from "@backend/common/errors/event/event.errors";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { reorderEvents } from "@backend/event/queries/event.queries";
import { getReadAllFilter } from "@backend/event/services/event.service.util";

class EventService {
  /*
  Deletes all of a user's events
  REMINDER: this should only delete a user's *Compass* events --
            don't ever delete their events in gcal or any other 3rd party calendar
  */
  deleteAllByUser = async (userId: string, session?: ClientSession) => {
    const response = await mongoService.event.deleteMany(
      { user: userId },
      { session },
    );

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
      .filter(isInstance)
      .map((e) => new ObjectId(e.recurrence?.eventId));

    const baseEvents = await mongoService.event
      .find({ user: userId, _id: { $in: baseEventIds } })
      .toArray();

    return events
      .map((event) => {
        if (isInstance(event)) {
          const baseEvent = baseEvents.find(
            ({ _id }) => _id.toString() === event.recurrence?.eventId,
          );

          if (!baseEvent) {
            console.error(
              new BaseError(
                "Skipping instance. Base event not found for instance",
                `Tried with user: ${userId} and _id: ${event._id.toString()}`,
                Status.NOT_FOUND,
                true,
              ),
            );

            return undefined;
          }

          return {
            ...event,
            _id: event._id.toString(),
            recurrence: {
              eventId: baseEvent._id.toString(),
              rule: baseEvent.recurrence?.rule,
            },
          };
        }

        return { ...event, _id: event._id.toString() } as Schema_Event_Core;
      })
      .filter((e) => e) as Schema_Event_Core[];
  };

  readById = async (userId: string, eventId: string) => {
    const filter = {
      _id: mongoService.objectId(eventId),
      user: userId,
    };

    const event = await mongoService.event.findOne(filter);

    if (!event) {
      throw new BaseError(
        "Event not found",
        `Tried with user: ${userId} and _id: ${eventId}`,
        Status.NOT_FOUND,
        true,
      );
    }

    if (isInstance(event)) {
      const baseEvent = await mongoService.event.findOne({
        user: userId,
        _id: new ObjectId(event.recurrence?.eventId),
      });

      if (!baseEvent) {
        throw new BaseError(
          "Base event not found for instance",
          `Tried with user: ${userId} and _id: ${eventId}`,
          Status.NOT_FOUND,
          true,
        );
      }

      event.recurrence = {
        eventId: baseEvent._id.toString(),
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
  const { isSomeday } = _event;
  const calendarProvider = isSomeday ? CalendarProvider.COMPASS : provider;
  const providerData = MapEvent.toProviderData(_event, calendarProvider);

  const event = Object.assign(
    MapEvent.removeProviderData(_event),
    providerData,
    { updatedAt: new Date() },
  );

  const instances = rrule?.instances(calendarProvider) ?? [];

  const baseEvent = await mongoService.event.findOneAndReplace(
    { _id: _event._id, user: _event.user },
    event,
    { upsert: true, session, returnDocument: "after" },
  );

  if (!baseEvent?._id) {
    throw error(GenericError.NotSure, "Event creation failed");
  }

  if (instances.length > 0) {
    const bulkUpsert = mongoService.event.initializeUnorderedBulkOp();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    instances.forEach(({ _id, ...event }) => {
      bulkUpsert
        .find({
          startDate: event.startDate,
          endDate: event.endDate,
          recurrence: { eventId: baseEvent._id.toString() },
          user: event.user,
        })
        .upsert()
        .replaceOne(event);
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

export const _deleteSeries = async (
  _userId: string,
  _baseId: string,
  session?: ClientSession,
  keepBase = false,
) => {
  const userId = IDSchema.parse(_userId);
  const baseId = IDSchema.parse(_baseId);

  const $or: Array<Filter<WithId<Omit<Schema_Event, "_id">>>> = [
    { "recurrence.eventId": baseId, user: userId },
  ];

  if (!keepBase) $or.push({ _id: new ObjectId(baseId), user: userId });

  const response = await mongoService.event.deleteMany({ $or }, { session });

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
  try {
    const _gEvent = MapEvent.toGcal(event);

    const gcal = await getGcalClient(userId);
    const gEvent = await gcalService.createEvent(gcal, _gEvent);

    return gEvent;
  } catch (e) {
    const error = e as GaxiosError<gSchema$Event>;

    if (error.code?.toString() === "409") {
      return _updateGcal(userId, event, { status: "confirmed" });
    }

    throw e;
  }
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

  const updatedGEvent = await gcalService.updateEvent(
    gcal,
    event.gEventId,
    gEvent,
  );

  return updatedGEvent;
};

export const _deleteGcal = async (
  userId: string,
  gEventId: string,
): Promise<boolean> => {
  try {
    const gcal = await getGcalClient(userId);

    if (!gEventId) {
      throw error(
        GenericError.BadRequest,
        "cannot delete gcal event without id",
      );
    }

    const response = await gcalService.deleteEvent(gcal, gEventId);

    return response.status < 400;
  } catch (e) {
    const error = e as GaxiosError<gSchema$Event>;

    if (error.code?.toString() === "410") return true;

    throw e;
  }
};
