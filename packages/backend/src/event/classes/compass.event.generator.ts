import { ClientSession, Filter, ObjectId, WithId } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import {
  AllEventsUpdate,
  BaseEventSchema,
  EditableEventFieldsSchema,
  EventSchema,
  EventStatus,
  EventUpdate,
  EventUpdateSchema,
  InstanceEventSchema,
  RecurrenceSchema,
  RecurringEventUpdateScope,
  Schema_Base_Event,
  Schema_Event,
  Schema_Instance_Event,
  ThisAndFollowingEventsUpdate,
  ThisEventUpdate,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import {
  getEditableEventDiff,
  isAllDay,
  isInstance,
  mergeTimeFromDate,
} from "@core/util/event/event.util";
import mongoService from "@backend/common/services/mongo.service";
import { baseEventExclusionFilterExpr } from "../services/event.service.util";

export class CompassEventFactory {
  private static async findCompassEvent<T extends boolean = true>(
    eventId: ObjectId,
    calendar: ObjectId,
    session?: ClientSession,
    throwIfNotFound: T = true as T,
  ): Promise<T extends true ? Schema_Event : Schema_Event | null> {
    const filter: Filter<Schema_Event> = { _id: eventId, calendar };

    const event = await mongoService.event.findOne(filter, { session });

    if (throwIfNotFound && !event) {
      throw new Error(`Compass event not found for id: ${eventId}`);
    }

    return event!;
  }

  private static async findCompassBaseAndInstanceEvent(
    eventId: ObjectId,
    calendar: ObjectId,
    session?: ClientSession,
  ): Promise<{
    baseEvent: WithId<Schema_Base_Event>;
    instanceEvent: WithId<Omit<Schema_Instance_Event, "_id">>;
  }> {
    // get instance event or throw
    const event = await CompassEventFactory.findCompassEvent(
      eventId,
      calendar,
      session,
      true,
    );

    const instanceEvent = InstanceEventSchema.parse(event, {
      error: () => "event is not a recurrence instance",
    });

    const baseEventId = instanceEvent.recurrence.eventId;

    // get base event in series or throw
    const baseEvent = await CompassEventFactory.findCompassEvent(
      baseEventId,
      calendar,
      session,
      true,
    );

    return {
      baseEvent: BaseEventSchema.parse(baseEvent, {
        error: () => "event is not a recurrence base event",
      }),
      instanceEvent,
    };
  }

  private static async genThisAndFollowingEventsUpdate(
    event: ThisAndFollowingEventsUpdate,
    session?: ClientSession,
  ): Promise<EventUpdate[]> {
    const { baseEvent, instanceEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(
        event.payload._id,
        event.payload.calendar,
        session,
      );

    const baseStartDate = dayjs(baseEvent.startDate);
    const startDate = dayjs(instanceEvent.originalStartDate);
    const updateAllSeries = startDate.isSameOrBefore(baseStartDate);
    const allDay = isAllDay(instanceEvent);

    if (updateAllSeries) {
      return CompassEventFactory.genAllEvents(
        {
          ...event,
          applyTo: RecurringEventUpdateScope.ALL_EVENTS,
        },
        session,
      );
    }

    const applyTo = RecurringEventUpdateScope.THIS_EVENT;
    const endDate = dayjs(instanceEvent.endDate);
    const duration = endDate.diff(startDate);

    const oldUntil = startDate.subtract(
      allDay ? 1 : duration,
      allDay ? "day" : "millisecond",
    );

    const rruleTruncatedSeries = new CompassEventRRule(baseEvent, {
      until: oldUntil.toDate(),
    });

    const truncateOldSeries = {
      ...event,
      status: EventStatus.CONFIRMED,
      applyTo,
      payload: rruleTruncatedSeries.base(),
    };

    if (event.status === EventStatus.CANCELLED) return [truncateOldSeries];

    const payload = EditableEventFieldsSchema.parse(event.payload);
    const _id = new ObjectId();
    const lastEventOldSeries = await mongoService.event.findOne(
      {
        "recurrence.eventId": baseEvent._id,
        $expr: baseEventExclusionFilterExpr,
      },
      { sort: { startDate: -1 }, session },
    );

    const rruleNewSeries = new CompassEventRRule(
      {
        ...MapEvent.removeIdentifyingData(instanceEvent),
        ...payload,
        order: 0,
        _id,
        recurrence: RecurrenceSchema.parse({
          eventId: _id,
          rule: payload.recurrence?.rule,
        }),
      },
      { until: lastEventOldSeries?.endDate },
    );

    const newBase = rruleNewSeries.base();

    // new series
    const newBaseEvent = {
      ...event,
      applyTo,
      payload: newBase,
    };

    return [truncateOldSeries, newBaseEvent];
  }

  private static async genAllEvents(
    event: AllEventsUpdate,
    session?: ClientSession,
  ): Promise<AllEventsUpdate[]> {
    const { baseEvent, instanceEvent } =
      await CompassEventFactory.findCompassBaseAndInstanceEvent(
        event.payload._id,
        event.payload.calendar,
        session,
      );

    const changes = getEditableEventDiff(event.payload, instanceEvent);

    const compassEvent = {
      ...event,
      payload: EventSchema.parse({
        ...baseEvent,
        ...changes,
        startDate: mergeTimeFromDate(baseEvent.startDate, changes.startDate),
        endDate: mergeTimeFromDate(baseEvent.endDate, changes.endDate),
      }),
    };

    return [compassEvent];
  }

  private static async genThisEvent(
    event: ThisEventUpdate,
    session?: ClientSession,
  ): Promise<EventUpdate[]> {
    if (isInstance(event.payload)) {
      const { baseEvent } =
        await CompassEventFactory.findCompassBaseAndInstanceEvent(
          event.payload._id,
          event.payload.calendar,
          session,
        );

      Object.assign(event.payload, {
        isSomeday: baseEvent.isSomeday,
        recurrence: baseEvent.recurrence,
      });
    }

    return Promise.resolve([event]);
  }

  static async generateEvents(
    _event: EventUpdate,
    session?: ClientSession,
  ): Promise<EventUpdate[]> {
    const event = EventUpdateSchema.parse(_event);

    switch (event.applyTo) {
      case RecurringEventUpdateScope.ALL_EVENTS:
        return CompassEventFactory.genAllEvents(event, session);
      case RecurringEventUpdateScope.THIS_AND_FOLLOWING_EVENTS:
        return CompassEventFactory.genThisAndFollowingEventsUpdate(
          event,
          session,
        );
      case RecurringEventUpdateScope.THIS_EVENT:
      default:
        return CompassEventFactory.genThisEvent(event, session);
    }
  }
}
