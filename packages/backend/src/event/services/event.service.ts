import type { GaxiosError } from "gaxios";
import { ClientSession, DeleteResult, Filter, ObjectId } from "mongodb";
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
import { MapGCalEvent } from "@core/mappers/map.gcal.event";
import {
  CalendarProvider,
  CompassCalendarSchema,
} from "@core/types/calendar.types";
import {
  BaseEventSchema,
  EditableEventFields,
  EditableEventFieldsSchema,
  EventSchema,
  EventStatus,
  InstanceEventSchema,
  Params_DeleteMany,
  RecurringEventUpdateScope,
  Result_DeleteMany,
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import { EventError } from "@backend/common/errors/event/event.errors";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import {
  baseEventExclusionFilterExpr,
  getReadAllFilter,
  instanceDateMongoAggregation,
} from "@backend/event/services/event.service.util";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

class EventService {
  createDefaultSomedays = async (user: ObjectId, calendarId: ObjectId) => {
    const now = dayjs();
    const startDate = now.endOf("week");
    const endDate = startDate.add(1, "hour");
    const createdAt = now.toDate();
    const monthlyRepeatId = new ObjectId();
    const weeklyRepeatId = new ObjectId();

    const _calendar = await calendarService.getByUser(user, calendarId);

    const calendar = CompassCalendarSchema.parse(_calendar, {
      error: () => "Calendar not found",
    });

    const thisWeek: Schema_Event = {
      _id: new ObjectId(),
      calendar: calendar._id,
      title: "⭐ That one thing...",
      isSomeday: true,
      startDate: startDate.toDate(),
      endDate: endDate.toDate(),
      priority: Priorities.UNASSIGNED,
      origin: Origin.COMPASS,
      order: 0,
      createdAt,
      description: `... that you wanna do this week, but aren't sure when.\
      \nKeep it here for safekeeping, then drag it over to the calendar once you're ready to commit times.\
      \n\nThese sidebar events are:\
      \n-filtered by the calendar week you're on\
      \n-limited to ${SOMEDAY_WEEKLY_LIMIT} per week`,
    };

    const weeklyRepeat: Schema_Base_Event = {
      _id: weeklyRepeatId,
      calendar: calendar._id,
      title: "🪴 Water plants",
      isSomeday: true,
      startDate: now.startOf("day").toDate(),
      endDate: now.add(1, "day").startOf("day").toDate(),
      origin: Origin.COMPASS,
      priority: Priorities.SELF,
      order: 0,
      createdAt,
      description: `This event happens every week.\
        \n\nRather than repeating forever, however, it'll stop after ${
          RRULE_COUNT_WEEKS / RRULE_COUNT_MONTHS
        } months.\
        \n\nThis encourages frequent re-prioritizing, rather than running on autopilot indefinitely.`,
      recurrence: { rule: [RRULE.WEEK], eventId: weeklyRepeatId },
    };

    const monthlyRepeat: Schema_Base_Event = {
      _id: monthlyRepeatId,
      calendar: calendar._id,
      isSomeday: true,
      origin: Origin.COMPASS,
      priority: Priorities.RELATIONS,
      startDate: now.startOf("day").toDate(),
      endDate: now.add(1, "day").startOf("day").toDate(),
      createdAt,
      order: 0,
      title: "🎲 Schedule game night",
      recurrence: { rule: [RRULE.MONTH], eventId: monthlyRepeatId },
      description: `This one repeats once a month for ${RRULE_COUNT_MONTHS} months`,
    };

    return CompassSyncProcessor.processEvents(
      [weeklyRepeat, monthlyRepeat, thisWeek].map((payload) => {
        return {
          calendar,
          payload,
          providerSync: true,
          status: EventStatus.CONFIRMED,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        };
      }),
    );
  };

  /*
   * Deletes all of a user's events
   * REMINDER: this should only delete a user's *Compass* events --
   * don't ever delete their events in gcal or any other 3rd party calendar
   */
  deleteAllByUser = async (
    user: ObjectId,
    calendar?: ObjectId,
    session?: ClientSession,
  ): Promise<DeleteResult> => {
    const CalendarSchema = CompassCalendarSchema.array().nonempty({
      error: () => "No calendars found for user",
    });

    const userCalendars = calendar
      ? await calendarService
          .getByUser(user, calendar)
          .then((c) => CalendarSchema.parse([c]))
      : await calendarService
          .getAllByUser(user)
          .then((calendars) => CalendarSchema.parse(calendars));

    const response = await Promise.all(
      userCalendars.map(({ _id: calendar }) =>
        mongoService.event.deleteMany({ calendar }, { session }),
      ),
    );

    return response.reduce(
      (acc, { acknowledged, deletedCount }) => ({
        acknowledged: acc.acknowledged && acknowledged,
        deletedCount: acc.deletedCount + deletedCount,
      }),
      { acknowledged: true, deletedCount: 0 },
    );
  };

  deleteMany = async (
    calendar: ObjectId,
    params: Params_DeleteMany,
  ): Promise<Result_DeleteMany> => {
    const errors = [];
    const response = await mongoService.event.deleteMany({
      calendar,
      [params.key]: { $in: params.ids },
    });

    if (response.deletedCount !== params.ids.length) {
      errors.push(
        `Only deleted ${response.deletedCount}/${params.ids.length} events`,
      );
    }
    const result = { deletedCount: response.deletedCount, errors: errors };
    return result;
  };

  deleteByIntegration = async (
    integration: CalendarProvider,
    user: ObjectId,
  ) => {
    if (integration !== CalendarProvider.GOOGLE) {
      error(
        GenericError.NotImplemented,
        `Failed to delete events for ${integration} integration`,
      );
    }

    const calendars = await calendarService.getAllByUser(user, integration);

    const response = await mongoService.event.deleteMany({
      calendar: { $in: calendars.map((cal) => cal._id) },
      isSomeday: false,
      metadata: { $exists: true },
    });

    return response;
  };

  readAll = async (
    calendar: ObjectId,
    query: Partial<
      Pick<Schema_Event, "startDate" | "endDate" | "isSomeday"> & {
        priorities?: Schema_Event["priority"][];
      }
    > = {},
  ): Promise<Schema_Event[]> => {
    const filter = getReadAllFilter(calendar, query);
    const { isSomeday = false } = query;
    const limit = isSomeday ? SOMEDAY_WEEKLY_LIMIT + SOMEDAY_MONTHLY_LIMIT : -1;

    const events = await mongoService.event
      .find(filter)
      .limit(limit)
      .sort(isSomeday ? { order: 1, startDate: 1 } : { startDate: 1 })
      .toArray();

    return events;
  };

  readById = async (calendar: ObjectId, eventId: ObjectId) => {
    const _event = await mongoService.event.findOne({ _id: eventId, calendar });

    const event = EventSchema.parse(_event, {
      error: () =>
        new BaseError(
          "Event not found",
          `Tried with calendar: ${calendar} and _id: ${eventId}`,
          Status.NOT_FOUND,
          true,
        ),
    });

    return event;
  };

  reorder = async (
    calendar: ObjectId,
    events: Array<Pick<Schema_Event, "_id" | "order">>,
  ) => {
    const ordered = EventSchema.pick({
      _id: true,
      calendar: true,
      order: true,
    })
      .array()
      .nonempty()
      .parse(events, {
        error: () => error(GenericError.BadRequest, "No events to reorder"),
      });

    const result = await mongoService.event.bulkWrite(
      ordered.map((item) => ({
        updateOne: {
          filter: { _id: item._id, calendar },
          update: { $set: { order: item.order } },
        },
      })),
    );

    return result;
  };

  async findBaseEvent(
    event: Pick<Schema_Instance_Event, "recurrence" | "calendar" | "_id">,
    session?: ClientSession,
  ): Promise<Schema_Base_Event> {
    const base = await mongoService.event.findOne(
      { _id: event.recurrence.eventId, calendar: event.calendar },
      { session },
    );

    return BaseEventSchema.parse(base, {
      error: () =>
        error(
          EventError.NoMatchingEvent,
          `Base event not found for instance ${event._id}`,
        ),
    });
  }

  async createGcalEvent(
    userId: ObjectId,
    gCalendarId: string,
    event: Schema_Event,
  ): Promise<gSchema$Event> {
    try {
      const _gEvent = MapGCalEvent.fromEvent(event);

      const gcal = await getGcalClient(userId);
      const gEvent = await gcalService.createEvent(gcal, _gEvent, gCalendarId);

      return gEvent;
    } catch (e) {
      const error = e as GaxiosError<gSchema$Event>;

      if (error.code?.toString() === "409") {
        return this.updateGcalEvent(userId, gCalendarId, event, {
          status: "confirmed",
        });
      }

      throw e;
    }
  }

  async updateGcalEvent(
    userId: ObjectId,
    gCalendarId: string,
    event: Schema_Event,
    extras?: Pick<gSchema$Event, "status">,
  ): Promise<gSchema$Event> {
    const { id, ...gEvent } = MapGCalEvent.fromEvent(event, extras);
    const gcal = await getGcalClient(userId);
    const gEventId = StringV4Schema.parse(id, {
      error: () =>
        error(
          EventError.MissingProperty,
          "cannot update gcal event without id",
        ),
    });

    const updatedGEvent = await gcalService.updateEvent(
      gcal,
      gEventId,
      gEvent,
      gCalendarId,
    );

    return updatedGEvent;
  }

  async deleteGcalEvent(
    userId: ObjectId,
    gCalendarId: string,
    _gEventId: string,
  ): Promise<boolean> {
    try {
      const gcal = await getGcalClient(userId);
      const gEventId = StringV4Schema.parse(_gEventId, {
        error: () =>
          error(
            EventError.MissingProperty,
            "cannot update gcal event without id",
          ),
      });

      const response = await gcalService.deleteEvent(
        gcal,
        gEventId,
        gCalendarId,
      );

      return response.status < 400;
    } catch (e) {
      const error = e as GaxiosError<gSchema$Event>;

      if (error.code?.toString() === "410") return true;

      throw e;
    }
  }

  async create(
    { metadata, ...event }: Schema_Event,
    rrule?: CompassEventRRule | null,
    session?: ClientSession,
  ): Promise<Schema_Event> {
    if (!event.isSomeday) {
      Object.assign(event, {
        metadata: metadata ?? MapEvent.toProviderMetadata(event),
      });
    }

    const instances = rrule?.instances() ?? [];

    const baseEventUpdate = await mongoService.event.findOneAndReplace(
      { _id: event._id, calendar: event.calendar },
      event,
      { upsert: true, session, returnDocument: "after" },
    );

    const baseEvent = EventSchema.parse(baseEventUpdate, {
      error: () => "Base event not found, creation failed",
    });

    if (instances.length > 0) {
      const bulkUpsert = mongoService.event.initializeUnorderedBulkOp();

      instances.forEach((instance) => {
        bulkUpsert
          .find({
            originalStartDate: instance.originalStartDate,
            recurrence: { eventId: baseEvent._id },
            calendar: instance.calendar,
          })
          .upsert()
          .replaceOne(InstanceEventSchema.omit({ _id: true }).parse(instance));
      });

      await bulkUpsert.execute({ session });
    }

    return baseEvent;
  }

  async update(
    _event: Schema_Event,
    session?: ClientSession,
  ): Promise<Schema_Event> {
    const updatedAt = new Date();
    const event = Object.assign({}, _event, { updatedAt });

    if (event.recurrence === null) delete event.recurrence;

    const cEvent = await mongoService.event.findOneAndReplace(
      { _id: event._id, calendar: event.calendar },
      event,
      { session, returnDocument: "after" },
    );

    return EventSchema.parse(cEvent, {
      error: () => "updated compass event not found",
    });
  }

  async updateSeries(
    baseEvent: Schema_Base_Event,
    _update: Partial<EditableEventFields>,
    session?: ClientSession,
  ): Promise<Schema_Base_Event> {
    const rrule = new CompassEventRRule(BaseEventSchema.parse(baseEvent));
    const instances = rrule.instances();

    // Delete Orphaned Instances
    await mongoService.event.deleteMany(
      {
        calendar: baseEvent.calendar,
        "recurrence.eventId": baseEvent._id,
        $expr: baseEventExclusionFilterExpr,
        originalStartDate: { $nin: instances.map((i) => i.originalStartDate) },
      },
      { session },
    );

    const changes: EditableEventFields =
      EditableEventFieldsSchema.partial().parse(_update);

    const update = Object.assign(changes, { updatedAt: new Date() });

    if (update.startDate) {
      Object.assign(update, {
        startDate: instanceDateMongoAggregation(update.startDate, "startDate"),
      });
    }
    if (update.endDate) {
      Object.assign(update, {
        endDate: instanceDateMongoAggregation(update.endDate, "endDate"),
      });
    }

    // update instances
    if (instances.length > 0) {
      const bulkUpsert = mongoService.event.initializeUnorderedBulkOp();

      instances.forEach((instance) => {
        for (const key in update) {
          delete instance[key as keyof Schema_Event];
        }

        bulkUpsert
          .find({
            originalStartDate: instance.originalStartDate,
            recurrence: { eventId: baseEvent._id },
            calendar: instance.calendar,
            $expr: baseEventExclusionFilterExpr,
          })
          .upsert()
          .update({
            $setOnInsert: {
              ...instance,
              ...update,
              createdAt: new Date(),
            },
            $set: update,
          });
      });

      await bulkUpsert.execute({ session });
    } else {
      // delete empty series
      await this.deleteSeries(baseEvent, session);
    }

    return BaseEventSchema.parse({ ...baseEvent, ...update });
  }

  delete = async (
    _event: Schema_Event,
    session?: ClientSession,
  ): Promise<Schema_Event> => {
    const calendar = _event.calendar;

    const event = await mongoService.event.findOneAndDelete(
      { _id: _event._id, calendar },
      { session },
    );

    if (!event) {
      throw error(GenericError.NotSure, "deleted compass event not returned");
    }

    return event;
  };

  async deleteSeries(
    baseEvent: Schema_Base_Event,
    session?: ClientSession,
    keepBase = false,
  ): Promise<DeleteResult> {
    const event = BaseEventSchema.parse(baseEvent);

    const filter: Filter<Schema_Event> = {
      "recurrence.eventId": event._id,
      calendar: event.calendar,
    };

    if (!keepBase)
      Object.assign(filter, { $expr: baseEventExclusionFilterExpr });

    const response = await mongoService.event.deleteMany(filter, { session });

    return response;
  }
}

export default new EventService();
